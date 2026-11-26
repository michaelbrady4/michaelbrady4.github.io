import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeUrl } from './sanitize-url.mjs';
import { cleanReview, domainOf } from './text.mjs';

test('strips tracking and share tokens', () => {
  const cleaned = sanitizeUrl(
    'https://www.example.com/path?utm_source=x&utm_medium=social&id=9&ref=tw&s=1&r=sub&token=abc&t=zzzz&keep=yes',
  );
  const url = new URL(cleaned);
  assert.equal(url.origin + url.pathname, 'https://www.example.com/path');
  assert.deepEqual([...url.searchParams.keys()], ['id', 'keep']);
  assert.equal(url.searchParams.get('id'), '9');
});

test('keeps a YouTube style timestamp and drops a tracking t value', () => {
  const timed = new URL(sanitizeUrl('https://www.youtube.com/watch?v=abc&t=1m30s&utm_campaign=share'));
  assert.equal(timed.searchParams.get('v'), 'abc');
  assert.equal(timed.searchParams.get('t'), '1m30s');
  assert.equal(timed.searchParams.get('utm_campaign'), null);

  const tracked = new URL(sanitizeUrl('https://example.com/a?t=8f3ab19c0d&s=share'));
  assert.equal(tracked.search, '');
});

test('leaves non-http values untouched', () => {
  assert.equal(sanitizeUrl('not a url'), 'not a url');
  assert.equal(sanitizeUrl('mailto:mb.bradymike@gmail.com?subject=hi'), 'mailto:mb.bradymike@gmail.com?subject=hi');
});

test('domain drops a leading www', () => {
  assert.equal(domainOf('https://www.nytimes.com/2026/01/01/story'), 'nytimes.com');
});

test('review cleanup drops star rows and automatic watch notes', () => {
  assert.equal(cleanReview('★★★★★  A real note.'), 'A real note.');
  assert.equal(cleanReview('<p>Watched on Sunday April 19, 2026.</p>'), null);
  assert.equal(cleanReview('<p>Best documentary I’ve seen</p>'), 'Best documentary I’ve seen');
});
