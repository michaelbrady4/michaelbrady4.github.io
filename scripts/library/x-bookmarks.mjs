import { readFile } from 'node:fs/promises';
import { clip, domainOf } from './text.mjs';
import { sanitizeUrl } from './sanitize-url.mjs';

export const X_API = 'https://api.x.com';
export const REQUIRED_SECRETS = ['X_CLIENT_ID', 'X_CLIENT_SECRET', 'X_REFRESH_TOKEN', 'LIBRARY_SECRETS_PAT'];

const SOCIAL_HOSTS = new Set(['x.com', 'twitter.com', 'mobile.twitter.com', 'mobile.x.com']);

export function missingSecrets(env = process.env) {
  return REQUIRED_SECRETS.filter((key) => !String(env[key] ?? '').trim());
}

export async function readAllowlist(file) {
  const raw = JSON.parse(await readFile(file, 'utf8'));
  const folders = Array.isArray(raw) ? raw : raw?.folders;
  if (!Array.isArray(folders) || folders.some((entry) => typeof entry !== 'string')) {
    throw new Error('bookmark-folders.json must be a JSON array of folder names, or {"folders": ["Name"]}.');
  }
  return folders.map((entry) => entry.trim()).filter(Boolean);
}

export function matchFolders(folders, allowlist) {
  const wanted = allowlist.map((entry) => ({
    raw: entry,
    key: /^\d+$/.test(entry) ? entry : entry.toLowerCase(),
    byId: /^\d+$/.test(entry),
  }));
  const matched = [];
  for (const want of wanted) {
    const folder = folders.find((item) => (want.byId ? item.id === want.key : item.name.trim().toLowerCase() === want.key));
    if (folder) matched.push(folder);
  }
  return matched;
}

function primaryLink(post) {
  const urls = post?.entities?.urls ?? [];
  const candidates = urls
    .map((entry) => ({
      href: entry.unwound_url || entry.expanded_url || '',
      title: entry.title || '',
    }))
    .filter((entry) => entry.href.startsWith('http'));
  const external = candidates.find((entry) => {
    try {
      return !SOCIAL_HOSTS.has(new URL(entry.href).hostname.replace(/^www\./, ''));
    } catch {
      return false;
    }
  });
  return external || candidates[0] || null;
}

export function mapBookmark(post) {
  if (!post?.id) return null;
  const text = (post.note_tweet?.text || post.text || post.note || '').trim();
  const link = primaryLink(post);
  const statusUrl = `https://x.com/i/web/status/${post.id}`;
  const rawUrl = link?.href || statusUrl;
  const url = sanitizeUrl(rawUrl);
  const commentary = clip(
    text
      .replace(/https?:\/\/t\.co\/\w+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    160,
  );
  const titleSource = (link?.title || '').trim();
  const title = clip(titleSource || commentary || domainOf(url) || 'Saved link', 180);
  const note = titleSource && commentary && commentary !== titleSource ? commentary : null;
  const item = {
    id: String(post.id),
    title,
    url,
    domain: domainOf(url),
  };
  if (note) item.note = note;
  if (post.created_at) item.savedAt = post.created_at;
  return item;
}

export function postsNeedHydration(posts) {
  return posts.some((post) => post?.id && !post.text && !post.note_tweet);
}

export class RefreshError extends Error {
  constructor(message, { rotated = false } = {}) {
    super(message);
    this.name = 'RefreshError';
    this.rotated = rotated;
  }
}

export function scrub(text, secrets) {
  let clean = String(text ?? '');
  for (const secret of secrets) {
    if (secret && secret.length > 6) clean = clean.split(secret).join('[redacted]');
  }
  return clean.replace(/refresh_token=[^&\s]+/gi, 'refresh_token=[redacted]');
}
