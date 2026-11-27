import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

function readJson(name) {
  return JSON.parse(readFileSync(new URL(`../src/data/library/${name}`, import.meta.url), 'utf8'));
}

const reading = readJson('reading.json');
const watching = readJson('watching.json');

test('homepage Lately strip shows the latest book and film from the library data', async ({ page }) => {
  await page.goto('/');
  const lately = page.locator('section.lately');
  await expect(lately.getByRole('heading', { name: 'Lately' })).toBeVisible();

  const book = reading.currentlyReading[0] ?? reading.read[0];
  if (book) {
    const link = lately.getByRole('link', { name: new RegExp(book.title) });
    await expect(link).toHaveAttribute('href', '/library/#books');
    await expect(link).toContainText(reading.currentlyReading.length ? 'Reading' : 'Last read');
  }

  const film = watching.films[0];
  if (film) {
    const link = lately.getByRole('link', { name: new RegExp(film.title) });
    await expect(link).toHaveAttribute('href', '/library/#movies');
    await expect(link).toContainText('Last watched');
    if (film.rating) {
      await expect(link.getByRole('img', { name: `Rated ${film.rating} out of 5` })).toBeVisible();
    }
  }

  const text = await lately.textContent();
  expect(text).not.toContain('\u2014');
});

test('Lately links open the matching library tab', async ({ page }) => {
  await page.goto('/');
  await page.locator('section.lately a[href="/library/#movies"]').click();
  await expect(page).toHaveURL(/\/library\/#movies$/);
  await expect(page.getByRole('tab', { name: /^Movies/ })).toHaveAttribute('aria-selected', 'true');
});

for (const [path, image] of [
  ['/', '/og/home.png'],
  ['/projects/', '/og/projects.png'],
  ['/library/', '/og/library.png'],
  ['/blog/', '/og/blog.png'],
]) {
  test(`${path} has a social preview image that exists`, async ({ page, request }) => {
    await page.goto(path);
    const og = page.locator('meta[property="og:image"]');
    await expect(og).toHaveAttribute('content', `https://michaelbrady4.github.io${image}`);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');

    const response = await request.get(image);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
    const body = await response.body();
    // PNG width and height live at bytes 16 to 23 of the IHDR chunk.
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
  });
}

test('homepage describes Michael with structured data', async ({ page }) => {
  await page.goto('/');
  const raw = await page.locator('script[type="application/ld+json"]').textContent();
  const person = JSON.parse(raw);
  expect(person['@type']).toBe('Person');
  expect(person.name).toBe('Michael Brady');
  expect(person.url).toBe('https://michaelbrady4.github.io');
});

test('robots.txt and the sitemap list the pages', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Sitemap: https://michaelbrady4.github.io/sitemap-index.xml');

  const sitemap = await request.get('/sitemap-0.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const path of ['/', '/projects/', '/library/', '/blog/']) {
    expect(xml).toContain(`<loc>https://michaelbrady4.github.io${path}</loc>`);
  }
  expect(xml).not.toContain('/og/');
  expect(xml).not.toContain('404');
});

test('library covers load lazily and fall back to a plain tile when they fail', async ({ page }) => {
  await page.route(/(gr-assets|ltrbxd|ytimg)\.com/, (route) => route.abort());
  await page.goto('/library/');
  const images = page.locator('#library .library-media img');
  for (const img of await images.all()) {
    await expect(img).toHaveAttribute('loading', 'lazy');
    await expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
  }
  const covers = reading.currentlyReading.filter((b) => b.cover).length;
  if (covers) {
    await expect(page.locator('#panel-books .library-row.is-current .library-media-fallback')).toHaveCount(
      reading.currentlyReading.length,
    );
  }
});
