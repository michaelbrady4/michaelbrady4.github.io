import { cleanReview, decodeHtml } from './text.mjs';

export const LETTERBOXD_SHORT_URL = 'https://boxd.it/5EEPT';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export async function resolveLetterboxd(shortUrl = LETTERBOXD_SHORT_URL) {
  const response = await fetch(shortUrl, {
    redirect: 'manual',
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    signal: AbortSignal.timeout(20000),
  });
  const location = response.headers.get('location');
  if (!location) {
    throw new Error(`Letterboxd short link did not redirect (status ${response.status}).`);
  }
  const url = new URL(location, shortUrl);
  const username = url.pathname.split('/').filter(Boolean)[0];
  if (!username || username === 'film') {
    throw new Error(`Could not read a Letterboxd username from ${url.href}.`);
  }
  return {
    username,
    profileUrl: `https://letterboxd.com/${username}/`,
    feedUrl: `https://letterboxd.com/${username}/rss/`,
  };
}

function tag(item, name) {
  const match = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  if (!match) return '';
  return decodeHtml(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).trim();
}

export function parseLetterboxdRss(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
  return items
    .map((item) => {
      const title = tag(item, 'letterboxd:filmTitle');
      const url = tag(item, 'link');
      if (!title || !url) return null;
      const year = Number(tag(item, 'letterboxd:filmYear'));
      const rating = Number(tag(item, 'letterboxd:memberRating'));
      const description = tag(item, 'description');
      const poster = description.match(/<img[^>]+src="([^"]+)"/i)?.[1] ?? '';
      const review = cleanReview(description.replace(/<img[^>]*>/gi, ' '));
      const guid = tag(item, 'guid') || url;
      const watched = tag(item, 'letterboxd:watchedDate');
      const film = {
        id: guid,
        title,
        year: Number.isFinite(year) ? year : null,
        poster: poster ? decodeHtml(poster) : null,
        rating: Number.isFinite(rating) && rating > 0 ? rating : null,
        review,
        url,
        watchedDate: /^\d{4}-\d{2}-\d{2}$/.test(watched) ? watched : null,
      };
      if (film.year == null) delete film.year;
      if (!film.poster) delete film.poster;
      if (film.rating == null) delete film.rating;
      if (!film.review) delete film.review;
      if (!film.watchedDate) delete film.watchedDate;
      return film;
    })
    .filter(Boolean);
}

export async function fetchLetterboxd() {
  const identity = await resolveLetterboxd();
  const response = await fetch(identity.feedUrl, {
    headers: {
      Accept: 'application/rss+xml, application/xml, text/xml',
      'User-Agent': UA,
    },
    signal: AbortSignal.timeout(25000),
  });
  const xml = await response.text();
  if (!response.ok || !/<rss[\s>]/i.test(xml)) {
    throw new Error(`Letterboxd RSS was not available (status ${response.status}).`);
  }
  const films = parseLetterboxdRss(xml);
  if (films.length === 0) {
    throw new Error('Letterboxd RSS returned no films. Refusing to wipe the shelf.');
  }
  return {
    username: identity.username,
    profileUrl: identity.profileUrl,
    films,
  };
}
