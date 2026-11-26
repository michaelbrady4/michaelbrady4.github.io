/**
 * Remove tracking and share tokens from a URL.
 * Keys removed: utm_*, ref, s, t, r, token (any letter case).
 * A YouTube-style timestamp in `t` (90, 90s, 1m30s) is kept.
 */

const EXACT = new Set(['ref', 's', 't', 'r', 'token']);

function isTimestamp(value) {
  return /^\d+$/.test(value) || /^\d+s$/.test(value) || /^\d+m\d+s$/.test(value) || /^\d+h\d+m\d+s$/.test(value);
}

export function sanitizeUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return input;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return input;

  const kept = [];
  for (const [key, value] of url.searchParams) {
    const name = key.toLowerCase();
    if (name.startsWith('utm_')) continue;
    if (EXACT.has(name)) {
      if (name === 't' && isTimestamp(value)) {
        kept.push([key, value]);
      }
      continue;
    }
    kept.push([key, value]);
  }

  url.search = '';
  for (const [key, value] of kept) url.searchParams.append(key, value);
  return url.toString();
}
