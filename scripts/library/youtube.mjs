import { stripTags } from './text.mjs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Blank means "not set yet". A pasted playlist URL is reduced to its list id. */
export function normalizePlaylistId(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    const list = url.searchParams.get('list')?.trim();
    if (list) return list;
  } catch {
    // Not a URL. Treat the value as an id.
  }
  if (!/^[\w-]{8,}$/.test(raw)) {
    throw new Error(
      'playlistId should be the id from a YouTube playlist URL (the list= value), or the playlist URL itself.',
    );
  }
  return raw;
}

function field(entry, tag) {
  const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!match) return '';
  return stripTags(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'));
}

export function parseYouTubeFeed(xml) {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => match[1]);
  return entries
    .map((entry) => {
      const id = field(entry, 'yt:videoId');
      const title = field(entry, 'title');
      if (!id || !title) return null;
      const authorBlock = entry.match(/<author>([\s\S]*?)<\/author>/)?.[1] ?? '';
      const channelName = stripTags(authorBlock.match(/<name[^>]*>([\s\S]*?)<\/name>/)?.[1] ?? '');
      const published = field(entry, 'published');
      const added = published ? new Date(published) : null;
      const video = {
        id,
        title,
        url: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
        channel: channelName,
        thumbnail: `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`,
        addedAt: added && !Number.isNaN(added.getTime()) ? added.toISOString().slice(0, 10) : null,
      };
      if (!video.channel) delete video.channel;
      if (!video.addedAt) delete video.addedAt;
      return video;
    })
    .filter(Boolean);
}

export async function fetchYouTubePlaylist(playlistId) {
  const id = normalizePlaylistId(playlistId);
  if (!id) {
    throw new Error('YouTube playlist id is empty.');
  }
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(id)}`;
  const response = await fetch(feedUrl, {
    headers: {
      Accept: 'application/atom+xml, application/xml, text/xml',
      'User-Agent': UA,
    },
    signal: AbortSignal.timeout(25000),
  });
  const xml = await response.text();
  if (!response.ok || !/<feed[\s>]/i.test(xml)) {
    throw new Error(`YouTube playlist feed was not available (status ${response.status}).`);
  }
  const title = xml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  const playlistTitle = title ? stripTags(title[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1')) : '';
  const data = {
    playlistId: id,
    playlistUrl: `https://www.youtube.com/playlist?list=${encodeURIComponent(id)}`,
    videos: parseYouTubeFeed(xml),
  };
  if (playlistTitle) data.playlistTitle = playlistTitle;
  return data;
}
