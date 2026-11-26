import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePlaylistId, parseYouTubeFeed } from './youtube.mjs';

test('a blank playlist id is left blank', () => {
  assert.equal(normalizePlaylistId(''), '');
  assert.equal(normalizePlaylistId('   '), '');
  assert.equal(normalizePlaylistId(null), '');
});

test('a playlist URL is reduced to its list id', () => {
  assert.equal(
    normalizePlaylistId('https://www.youtube.com/playlist?list=PLexample1234&si=tracking'),
    'PLexample1234',
  );
  assert.equal(normalizePlaylistId('PLexample1234'), 'PLexample1234');
});

test('a short or spaced value is rejected', () => {
  assert.throws(() => normalizePlaylistId('not id'), /playlistId/);
  assert.throws(() => normalizePlaylistId('short'), /playlistId/);
});

test('parses a playlist atom entry into a video row', () => {
  const xml = `<?xml version="1.0"?>
  <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
    <entry>
      <yt:videoId>abc123XYZ1</yt:videoId>
      <title><![CDATA[A talk worth rewatching]]></title>
      <link rel="alternate" href="https://www.youtube.com/watch?v=abc123XYZ1&amp;t=12"/>
      <author><name>Some Channel</name></author>
      <published>2026-03-02T15:04:05+00:00</published>
      <media:group>
        <media:thumbnail url="https://i.ytimg.com/vi/abc123XYZ1/default.jpg" width="120" height="90"/>
      </media:group>
    </entry>
  </feed>`;
  const [video] = parseYouTubeFeed(xml);
  assert.equal(video.id, 'abc123XYZ1');
  assert.equal(video.title, 'A talk worth rewatching');
  assert.equal(video.channel, 'Some Channel');
  assert.equal(video.url, 'https://www.youtube.com/watch?v=abc123XYZ1');
  assert.equal(video.thumbnail, 'https://i.ytimg.com/vi/abc123XYZ1/hqdefault.jpg');
  assert.equal(video.addedAt, '2026-03-02');
});
