import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGoodreadsRss } from './goodreads.mjs';
import { parseLetterboxdRss } from './letterboxd.mjs';
import { safeUrl } from './text.mjs';

test('keeps https links on an allowed host or subdomain', () => {
  assert.equal(safeUrl('https://letterboxd.com/michaelb4/film/jobs/', ['letterboxd.com']), 'https://letterboxd.com/michaelb4/film/jobs/');
  assert.equal(safeUrl('https://a.ltrbxd.com/poster.jpg', ['ltrbxd.com']), 'https://a.ltrbxd.com/poster.jpg');
});

test('upgrades http to https', () => {
  assert.equal(safeUrl('http://www.goodreads.com/review/show/1', ['goodreads.com']), 'https://www.goodreads.com/review/show/1');
});

test('drops script, data, and off-site links', () => {
  const hosts = ['goodreads.com'];
  assert.equal(safeUrl('javascript:alert(1)//www.goodreads.com/review/show/1', hosts), null);
  assert.equal(safeUrl('data:text/html,hi', hosts), null);
  assert.equal(safeUrl('https://evil.example/review/show/1', hosts), null);
  assert.equal(safeUrl('https://goodreads.com.evil.example/', hosts), null);
  assert.equal(safeUrl('https://notgoodreads.com/', hosts), null);
  assert.equal(safeUrl('https://user:pass@www.goodreads.com/', hosts), null);
  assert.equal(safeUrl('not a url', hosts), null);
  assert.equal(safeUrl('', hosts), null);
});

test('a Goodreads item with an off-site link is skipped', () => {
  const xml = `<rss><channel><item>
    <title>Bad</title>
    <link>javascript:alert(1)//review/show/9</link>
  </item></channel></rss>`;
  assert.deepEqual(parseGoodreadsRss(xml), []);
});

test('a Letterboxd item with an off-site link or poster loses it', () => {
  const xml = `<rss><channel>
    <item>
      <link>javascript:alert(1)</link>
      <letterboxd:filmTitle>Bad link</letterboxd:filmTitle>
    </item>
    <item>
      <link>https://letterboxd.com/michaelb4/film/ok/</link>
      <letterboxd:filmTitle>Bad poster</letterboxd:filmTitle>
      <description><![CDATA[<p><img src="https://tracker.example/pixel.gif"/></p>]]></description>
    </item>
  </channel></rss>`;
  const films = parseLetterboxdRss(xml);
  assert.equal(films.length, 1);
  assert.equal(films[0].title, 'Bad poster');
  assert.equal(films[0].poster, undefined);
});
