import assert from 'node:assert/strict';
import test from 'node:test';
import { largerCover, parseGoodreadsRss, parseGoodreadsWidget } from './goodreads.mjs';
import { parseLetterboxdRss, sortFilms } from './letterboxd.mjs';

const widget = String.raw`  var widget_code = '  <div class=\"gr_custom_each_container_read\">\n          <div class=\"gr_custom_book_container_read\">\n            <a title=\"Example\" href=\"https://www.goodreads.com/review/show/123?utm_source=custom_widget\"><img alt=\"Example\" src=\"https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1l/1._SX98_.jpg\" /><\/a>\n          <\/div>\n          <div class=\"gr_custom_rating_read\">\n            <span><img src=\"https://s.gr-assets.com/images/layout/gr_flat_red_star_active.png\" /><img src=\"https://s.gr-assets.com/images/layout/gr_flat_red_star_active.png\" /><img src=\"https://s.gr-assets.com/images/layout/gr_flat_red_star_inactive.png\" /><\/span>\n          <\/div>\n          <div class=\"gr_custom_title_read\">\n            <a href=\"https://www.goodreads.com/review/show/123?utm_source=custom_widget&amp;utm_medium=api\">Example Book<\/a>\n          <\/div>\n          <div class=\"gr_custom_author_read\">\n            by <a href=\"https://www.goodreads.com/author/show/1.Ada\">Ada Lovelace<\/a>\n          <\/div>\n          <div class=\"gr_custom_review_read\">\n            ★★ A short note.\n          <\/div>\n      <\/div>\n'
  var widget_div = document.getElementById('gr_custom_widget_read')
`;

test('parses a Goodreads widget and strips share params', () => {
  const [book] = parseGoodreadsWidget(widget);
  assert.equal(book.id, '123');
  assert.equal(book.title, 'Example Book');
  assert.equal(book.author, 'Ada Lovelace');
  assert.equal(book.rating, 2);
  assert.equal(book.review, 'A short note.');
  assert.equal(book.reviewUrl, 'https://www.goodreads.com/review/show/123');
  assert.equal(book.cover, largerCover('https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1l/1._SX98_.jpg'));
  assert.match(book.cover, /_SY475_/);
});

test('parses Goodreads RSS items', () => {
  const xml = `<?xml version="1.0"?><rss><channel><item>
    <title><![CDATA[Dune]]></title>
    <link>https://www.goodreads.com/review/show/55?utm_source=rss&amp;ref=nav</link>
    <author_name>Frank Herbert</author_name>
    <book_large_image_url>https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1l/2._SY160_.jpg</book_large_image_url>
    <user_rating>5</user_rating>
    <user_review><![CDATA[Still huge.]]></user_review>
  </item></channel></rss>`;
  const [book] = parseGoodreadsRss(xml);
  assert.equal(book.title, 'Dune');
  assert.equal(book.author, 'Frank Herbert');
  assert.equal(book.rating, 5);
  assert.equal(book.review, 'Still huge.');
  assert.equal(book.reviewUrl, 'https://www.goodreads.com/review/show/55');
});

test('parses Letterboxd items and skips the automatic watched line', () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item>
      <title>Primetime, 2026</title>
      <link>https://letterboxd.com/michaelb4/film/primetime-2026/</link>
      <guid>letterboxd-review-1</guid>
      <letterboxd:filmTitle>Primetime</letterboxd:filmTitle>
      <letterboxd:filmYear>2026</letterboxd:filmYear>
      <letterboxd:memberRating>1.5</letterboxd:memberRating>
      <letterboxd:watchedDate>2026-10-22</letterboxd:watchedDate>
      <description><![CDATA[ <p><img src="https://a.ltrbxd.com/resized/poster.jpg"/></p> <p>Didn’t enjoy it</p> ]]></description>
    </item>
    <item>
      <link>https://letterboxd.com/michaelb4/film/jobs/</link>
      <letterboxd:filmTitle>Jobs</letterboxd:filmTitle>
      <letterboxd:filmYear>2013</letterboxd:filmYear>
      <letterboxd:memberRating>3.0</letterboxd:memberRating>
      <description><![CDATA[ <p><img src="https://a.ltrbxd.com/resized/jobs.jpg"/></p> <p>Watched on Sunday April 19, 2026.</p> ]]></description>
    </item>
  </channel></rss>`;
  const films = parseLetterboxdRss(xml);
  assert.equal(films.length, 2);
  assert.equal(films[0].title, 'Primetime');
  assert.equal(films[0].year, 2026);
  assert.equal(films[0].rating, 1.5);
  assert.equal(films[0].review, 'Didn’t enjoy it');
  assert.equal(films[0].poster, 'https://a.ltrbxd.com/resized/poster.jpg');
  assert.equal(films[0].watchedDate, '2026-10-22');
  assert.equal(films[1].review, undefined);
});

test('sorts films by watched date, newest first, and uses pubDate when watched date is missing', () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item>
      <link>https://letterboxd.com/michaelb4/film/older/</link>
      <letterboxd:filmTitle>Older</letterboxd:filmTitle>
      <letterboxd:watchedDate>2026-01-02</letterboxd:watchedDate>
      <pubDate>Sat, 03 Jan 2026 12:00:00 +0000</pubDate>
    </item>
    <item>
      <link>https://letterboxd.com/michaelb4/film/newest/</link>
      <letterboxd:filmTitle>Newest</letterboxd:filmTitle>
      <letterboxd:watchedDate>2026-11-22</letterboxd:watchedDate>
      <pubDate>Mon, 01 Jan 2026 12:00:00 +0000</pubDate>
    </item>
    <item>
      <link>https://letterboxd.com/michaelb4/film/logged-only/</link>
      <letterboxd:filmTitle>Logged only</letterboxd:filmTitle>
      <pubDate>Wed, 15 Jul 2026 12:00:00 +0000</pubDate>
    </item>
  </channel></rss>`;
  const films = parseLetterboxdRss(xml);
  assert.deepEqual(
    films.map((film) => film.title),
    ['Newest', 'Logged only', 'Older'],
  );
  assert.equal(films[0].watchedDate, '2026-11-22');
  assert.equal(films[1].watchedDate, undefined);
  assert.equal(films[2].watchedDate, '2026-01-02');
  assert.equal('publishedAt' in films[0], false);

  const tied = sortFilms([
    { title: 'Morning', watchedDate: '2026-05-01', publishedAt: Date.parse('2026-05-01T08:00:00Z') },
    { title: 'Evening', watchedDate: '2026-05-01', publishedAt: Date.parse('2026-05-01T20:00:00Z') },
  ]);
  assert.deepEqual(
    tied.map((film) => film.title),
    ['Evening', 'Morning'],
  );
});
