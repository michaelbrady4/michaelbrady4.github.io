import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchGoodreads } from './goodreads.mjs';
import { fetchLetterboxd } from './letterboxd.mjs';
import { fetchYouTubePlaylist, normalizePlaylistId } from './youtube.mjs';
import { reportRefreshFailure, updateActionsSecret } from './github.mjs';
import { writeIfChanged } from './store.mjs';
import {
  RefreshError,
  X_API,
  mapBookmark,
  matchFolders,
  missingSecrets,
  postsNeedHydration,
  readAllowlist,
  scrub,
} from './x-bookmarks.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dataDir = resolve(root, 'src/data/library');

function mask(value) {
  if (value && process.env.GITHUB_ACTIONS) console.log(`::add-mask::${value}`);
}

async function xFetch(path, token, query) {
  const url = new URL(path, X_API);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value != null && value !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(25000),
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`X API ${response.status} for ${path}: ${text.slice(0, 400)}`);
    error.status = response.status;
    throw error;
  }
  return text ? JSON.parse(text) : {};
}

async function refreshAccessToken() {
  const clientId = process.env.X_CLIENT_ID.trim();
  const clientSecret = process.env.X_CLIENT_SECRET.trim();
  const refreshToken = process.env.X_REFRESH_TOKEN.trim();
  mask(clientSecret);
  mask(refreshToken);

  let response;
  try {
    response = await fetch(`${X_API}/2/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    throw new RefreshError(`The token request did not complete. ${error.message}`, { rotated: false });
  }

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  if (!response.ok || !payload?.access_token || !payload?.refresh_token) {
    throw new RefreshError(
      `X refused the refresh (${response.status}). ${scrub(text, [clientSecret, refreshToken]).slice(0, 400)}`,
      { rotated: false },
    );
  }

  mask(payload.access_token);
  mask(payload.refresh_token);
  const repo = process.env.GITHUB_REPOSITORY;
  const pat = process.env.LIBRARY_SECRETS_PAT.trim();
  mask(pat);
  if (!repo) {
    throw new RefreshError('GITHUB_REPOSITORY is missing, so the new refresh token cannot be saved.', {
      rotated: true,
    });
  }
  try {
    await updateActionsSecret({
      token: pat,
      repo,
      name: 'X_REFRESH_TOKEN',
      value: payload.refresh_token,
    });
  } catch (error) {
    throw new RefreshError(scrub(error.message, [payload.refresh_token, payload.access_token, pat]), {
      rotated: true,
    });
  }
  console.log('Saved the rotated X refresh token.');
  return payload.access_token;
}

async function collect(path, token, query) {
  const rows = [];
  let paginationToken = '';
  const seen = new Set();
  for (let page = 0; page < 20; page += 1) {
    const body = await xFetch(path, token, { ...query, pagination_token: paginationToken || undefined });
    const data = Array.isArray(body.data) ? body.data : [];
    rows.push(...data);
    const next = body.meta?.next_token || '';
    if (!next || seen.has(next)) break;
    seen.add(next);
    paginationToken = next;
  }
  return rows;
}

async function paginate(path, token, query) {
  try {
    return await collect(path, token, query);
  } catch (error) {
    if (error.status !== 400) throw error;
    console.log(`X rejected the query for ${path}. Retrying without extra fields.`);
    return await collect(path, token, query.max_results ? { max_results: query.max_results } : {});
  }
}

async function hydrate(posts, token) {
  if (!postsNeedHydration(posts)) return posts;
  const byId = new Map(posts.map((post) => [String(post.id), post]));
  const ids = [...byId.keys()];
  for (let index = 0; index < ids.length; index += 100) {
    const slice = ids.slice(index, index + 100);
    let body;
    try {
      body = await xFetch('/2/tweets', token, {
        ids: slice.join(','),
        'tweet.fields': 'created_at,entities,note_tweet,text',
      });
    } catch (error) {
      if (error.status !== 400) throw error;
      body = await xFetch('/2/tweets', token, { ids: slice.join(',') });
    }
    for (const post of body.data ?? []) byId.set(String(post.id), post);
  }
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

export async function syncBookmarks() {
  const missing = missingSecrets();
  if (missing.length) {
    console.log(`Skipping X bookmarks. Missing secret${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.`);
    return { skipped: true };
  }

  const accessToken = await refreshAccessToken();
  const allowlist = await readAllowlist(resolve(dataDir, 'bookmark-folders.json'));
  if (allowlist.length === 0) {
    console.log('Bookmark folder allowlist is empty. No saved links were published.');
    const wrote = await writeIfChanged(resolve(dataDir, 'bookmarks.json'), { folders: [] });
    console.log(wrote ? 'Wrote empty bookmarks file.' : 'Bookmarks file already empty.');
    return { skipped: false, folders: 0 };
  }

  const me = await xFetch('/2/users/me', accessToken);
  const userId = me?.data?.id;
  if (!userId) throw new Error('X did not return the signed-in user id.');

  const folderRows = await paginate(`/2/users/${userId}/bookmarks/folders`, accessToken, { max_results: 100 });
  const folders = matchFolders(
    folderRows.map((folder) => ({ id: String(folder.id), name: String(folder.name ?? '') })),
    allowlist,
  );
  const missingNames = allowlist.filter(
    (entry) =>
      !folders.some((folder) => folder.id === entry || folder.name.trim().toLowerCase() === entry.toLowerCase()),
  );
  if (missingNames.length) {
    console.log(`Allowlist folders not found on X: ${missingNames.join(', ')}.`);
  }

  const published = [];
  for (const folder of folders) {
    let posts = await paginate(`/2/users/${userId}/bookmarks/folders/${folder.id}`, accessToken, {
      max_results: 100,
      'post.fields': 'created_at,entities,note_tweet,text',
      'tweet.fields': 'created_at,entities,note_tweet,text',
    });
    posts = await hydrate(posts, accessToken);
    published.push({
      id: folder.id,
      name: folder.name,
      items: posts.map(mapBookmark).filter(Boolean),
    });
  }

  const wrote = await writeIfChanged(resolve(dataDir, 'bookmarks.json'), { folders: published });
  console.log(wrote ? `Updated ${published.length} bookmark folder${published.length === 1 ? '' : 's'}.` : 'Bookmarks unchanged.');
  return { skipped: false, folders: published.length };
}

async function syncYouTube() {
  const file = resolve(dataDir, 'youtube.json');
  let raw;
  try {
    raw = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Skipping YouTube. src/data/library/youtube.json is missing.');
      return;
    }
    throw error;
  }
  const playlistId = normalizePlaylistId(raw?.playlistId);
  if (!playlistId) {
    console.log('Skipping YouTube. playlistId in src/data/library/youtube.json is empty.');
    return;
  }
  const data = await fetchYouTubePlaylist(playlistId);
  const wrote = await writeIfChanged(file, data);
  console.log(wrote ? `Updated YouTube (${data.videos.length} videos).` : 'YouTube unchanged.');
}

async function syncFeeds() {
  const [reading, watching] = await Promise.all([fetchGoodreads(), fetchLetterboxd()]);
  const readingWrote = await writeIfChanged(resolve(dataDir, 'reading.json'), reading);
  const watchingWrote = await writeIfChanged(resolve(dataDir, 'watching.json'), watching);
  console.log(
    `${readingWrote ? 'Updated' : 'Unchanged'} reading (${reading.currentlyReading.length} current, ${reading.read.length} read, source ${reading.source}).`,
  );
  console.log(
    `${watchingWrote ? 'Updated' : 'Unchanged'} watching (${watching.films.length} films, @${watching.username}).`,
  );
  await syncYouTube();
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const errors = [];
  try {
    await syncFeeds();
  } catch (error) {
    errors.push(error);
  }
  try {
    await syncBookmarks();
  } catch (error) {
    if (error instanceof RefreshError) {
      try {
        await reportRefreshFailure({
          token: process.env.GITHUB_TOKEN,
          repo: process.env.GITHUB_REPOSITORY,
          message: error.message,
          rotated: error.rotated,
        });
      } catch (reportError) {
        errors.push(reportError);
      }
    }
    errors.push(error);
  }
  if (errors.length) {
    for (const error of errors) console.error(error?.stack || error?.message || error);
    process.exit(1);
  }
}
