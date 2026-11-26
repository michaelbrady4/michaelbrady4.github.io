/** Shared string helpers for the library sync. */

export function decodeHtml(value) {
  if (!value) return '';
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)));
}

export function stripTags(value) {
  return decodeHtml(String(value ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Drop a leading star row Goodreads sometimes puts in the review text. */
export function cleanReview(value) {
  const text = stripTags(value)
    .replace(/^(?:[★☆]+\s*)+/, '')
    .trim();
  if (!text) return null;
  if (/^watched on (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday) [a-z]+ \d{1,2}, \d{4}\.$/i.test(text)) {
    return null;
  }
  return clip(text, 280);
}

export function clip(value, max) {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const sliced = text.slice(0, max - 1);
  const word = sliced.replace(/\s+\S*$/, '').trim();
  return `${word || sliced.trim()}...`;
}

export function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}
