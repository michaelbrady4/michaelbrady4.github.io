import { cleanReview, decodeHtml, safeUrl, stripTags } from './text.mjs';
import { sanitizeUrl } from './sanitize-url.mjs';

export const GOODREADS_USER_ID = '143360526';
export const GOODREADS_PROFILE = `https://www.goodreads.com/user/show/${GOODREADS_USER_ID}`;

const LINK_HOSTS = ['goodreads.com'];
const COVER_HOSTS = ['gr-assets.com', 'goodreads.com', 'media-amazon.com', 'ssl-images-amazon.com'];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export function rssUrl(shelf) {
  return `https://www.goodreads.com/review/list_rss/${GOODREADS_USER_ID}?shelf=${encodeURIComponent(shelf)}`;
}

export function widgetUrl(shelf) {
  const params = new URLSearchParams({
    cover_position: 'left',
    cover_size: 'medium',
    num_books: '100',
    order: 'd',
    shelf,
    show_author: '1',
    show_cover: '1',
    show_rating: '1',
    show_review: '1',
    show_tags: '0',
    show_title: '1',
    sort: shelf === 'read' ? 'date_read' : 'date_added',
    widget_id: shelf,
  });
  return `https://www.goodreads.com/review/custom_widget/${GOODREADS_USER_ID}.${encodeURIComponent(shelf)}?${params}`;
}

export function largerCover(url) {
  if (!url) return null;
  const next = url.replace(/\._[A-Z]{2}\d+(?:_[A-Z]{2}\d+)?_\./, '._SY475_.');
  return next;
}

function reviewId(url) {
  const match = String(url).match(/review\/show\/(\d+)/);
  return match ? match[1] : null;
}

function bookFromParts({ title, author, cover, rating, review, reviewUrl }) {
  const href = reviewUrl ? safeUrl(sanitizeUrl(reviewUrl), LINK_HOSTS) : null;
  const id = reviewId(href);
  if (!title || !href || !id) return null;
  const book = {
    id,
    title,
    author: author || '',
    cover: cover ? safeUrl(largerCover(cover), COVER_HOSTS) : null,
    rating: rating > 0 ? rating : null,
    review: review || null,
    reviewUrl: href,
  };
  if (!book.cover) delete book.cover;
  if (book.rating == null) delete book.rating;
  if (!book.review) delete book.review;
  return book;
}

export function parseGoodreadsRss(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
  return items
    .map((item) => {
      const field = (name) => {
        const found = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
        if (!found) return '';
        return stripTags(found[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'));
      };
      const rating = Number(field('user_rating'));
      return bookFromParts({
        title: field('title'),
        author: field('author_name'),
        cover: field('book_large_image_url') || field('book_image_url'),
        rating: Number.isFinite(rating) ? rating : 0,
        review: cleanReview(field('user_review')),
        reviewUrl: field('link'),
      });
    })
    .filter(Boolean);
}

export function unescapeWidget(source) {
  const match = source.match(/var widget_code = '((?:\\.|[^'\\])*)'/);
  if (!match) {
    throw new Error('Goodreads widget response did not include a widget_code string.');
  }
  return match[1]
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/')
    .replace(/\\\\/g, '\\');
}

function blockField(block, prefix) {
  const match = block.match(new RegExp(`<div class="${prefix}[^"]*">([\\s\\S]*?)</div>`));
  return match ? match[1] : '';
}

export function parseGoodreadsWidget(source) {
  const html = unescapeWidget(source);
  const blocks = html.split(/<div class="gr_custom_each_container_[^"]+">/).slice(1);
  return blocks
    .map((block) => {
      const titleHtml = blockField(block, 'gr_custom_title_');
      const authorHtml = blockField(block, 'gr_custom_author_');
      const reviewHtml = blockField(block, 'gr_custom_review_');
      const ratingHtml = blockField(block, 'gr_custom_rating_');
      const cover = block.match(/<img[^>]+src="([^"]+)"/i)?.[1] ?? '';
      const title = stripTags(titleHtml.match(/<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? '');
      const author = stripTags(authorHtml.match(/<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? '');
      const reviewUrl = decodeHtml(titleHtml.match(/<a[^>]+href="([^"]+)"/i)?.[1] ?? '');
      const rating = (ratingHtml.match(/gr_flat_red_star_active/g) || []).length;
      return bookFromParts({
        title,
        author,
        cover: decodeHtml(cover),
        rating,
        review: cleanReview(reviewHtml),
        reviewUrl,
      });
    })
    .filter(Boolean);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/rss+xml, application/xml, text/xml, text/javascript, */*',
      'User-Agent': UA,
    },
    signal: AbortSignal.timeout(25000),
    redirect: 'follow',
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text, url: response.url };
}

async function loadShelf(shelf) {
  const rss = await fetchText(rssUrl(shelf));
  if (rss.ok && /<rss[\s>]/i.test(rss.text) && /<item>/i.test(rss.text)) {
    return { source: 'rss', books: parseGoodreadsRss(rss.text) };
  }

  const widget = await fetchText(widgetUrl(shelf));
  if (!widget.ok || !widget.text.includes('var widget_code')) {
    throw new Error(
      `Goodreads shelf "${shelf}" was not available. RSS status ${rss.status}. Widget status ${widget.status}.`,
    );
  }
  return { source: 'widget', books: parseGoodreadsWidget(widget.text) };
}

export async function fetchGoodreads() {
  const [current, read] = await Promise.all([loadShelf('currently-reading'), loadShelf('read')]);
  const source = current.source === 'rss' && read.source === 'rss' ? 'rss' : 'widget';
  if (current.books.length === 0 && read.books.length === 0) {
    throw new Error('Goodreads returned no books on currently-reading or read. Refusing to wipe the shelf.');
  }
  return {
    profileUrl: GOODREADS_PROFILE,
    source,
    currentlyReading: current.books,
    read: read.books,
  };
}
