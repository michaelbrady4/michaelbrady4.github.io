import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

function readJson(name) {
  return JSON.parse(readFileSync(new URL(`../src/data/library/${name}`, import.meta.url), 'utf8'));
}

const reading = readJson('reading.json');
const watching = readJson('watching.json');
const youtube = readJson('youtube.json');

test('library is in the nav and the three shelves are tabs', async ({ page }) => {
  await page.goto('/library/');
  await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
  await expect(page.getByText('Books, films, and videos I want to remember.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Library', exact: true })).toHaveAttribute('aria-current', 'page');

  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(0)).toHaveText(/Reading/);
  await expect(tabs.nth(1)).toHaveText(/Watching/);
  await expect(tabs.nth(2)).toHaveText(/YouTube/);
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: /From X/ })).toHaveCount(0);

  const chrome = await page
    .locator('h1, .library-lede, .library-tabs, .library-kicker, .library-empty')
    .evaluateAll((nodes) => nodes.map((node) => node.textContent).join('\n'));
  expect(chrome).not.toContain('\u2014');
});

test('reading shelf shows the Goodreads data', async ({ page }) => {
  await page.goto('/library/');
  await expect(page.getByRole('tab', { name: /^Reading/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('link', { name: 'Goodreads profile' })).toHaveAttribute('href', reading.profileUrl);

  if (reading.currentlyReading.length) {
    await expect(page.getByRole('heading', { name: 'Currently reading' })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Read', exact: true })).toBeVisible();

  for (const book of [...reading.currentlyReading, ...reading.read]) {
    const card = page.locator('.library-row', {
      has: page.getByRole('heading', { name: book.title, exact: true }),
    });
    await expect(card.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
    if (book.author) await expect(card.getByText(book.author, { exact: true })).toBeVisible();
    if (book.cover) await expect(card.locator('img')).toHaveAttribute('src', book.cover);
    if (book.rating) {
      await expect(card.getByRole('img', { name: `Rated ${book.rating} out of 5` })).toBeVisible();
    } else {
      await expect(card.locator('.star-rating')).toHaveCount(0);
    }
    const titleLink = card.getByRole('link', { name: book.title, exact: true });
    await expect(titleLink).toHaveAttribute('href', book.reviewUrl);
    if (book.review) {
      await expect(card.getByRole('link', { name: book.review })).toHaveAttribute('href', book.reviewUrl);
    }
  }

  const hrefs = await page.locator('a[href*="goodreads.com"]').evaluateAll((links) =>
    links.map((link) => link.getAttribute('href')),
  );
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) expect(href).not.toContain('utm_');
});

test('watching shelf shows the Letterboxd diary', async ({ page }) => {
  await page.goto('/library/');
  await page.getByRole('tab', { name: /^Watching/ }).click();
  await expect(page).toHaveURL(/#watching$/);
  await expect(page.getByRole('link', { name: 'Letterboxd profile' })).toHaveAttribute('href', watching.profileUrl);
  await expect(page.getByRole('heading', { name: 'Recent films' })).toBeVisible();

  const titles = (await page.locator('#panel-watching h3').allTextContents()).map((title) => title.trim());
  expect(titles).toEqual(watching.films.map((film) => film.title));
  const watched = watching.films.map((film) => film.watchedDate).filter(Boolean);
  expect(watched).toEqual([...watched].sort((a, b) => b.localeCompare(a)));

  for (const film of watching.films) {
    const card = page.locator('.library-row', {
      has: page.getByRole('heading', { name: film.title, exact: true }),
    });
    await expect(card.getByRole('link', { name: film.title, exact: true })).toHaveAttribute('href', film.url);
    if (film.year) await expect(card.getByText(String(film.year), { exact: true })).toBeVisible();
    if (film.watchedDate) {
      const label = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${film.watchedDate}T00:00:00Z`));
      await expect(card.getByText(label, { exact: true })).toBeVisible();
    }
    if (film.poster) await expect(card.locator('img')).toHaveAttribute('src', film.poster);
    if (film.rating) {
      await expect(card.getByRole('img', { name: `Rated ${film.rating} out of 5` })).toBeVisible();
    }
    if (film.review) {
      await expect(card.getByRole('link', { name: film.review })).toHaveAttribute('href', film.url);
    } else {
      await expect(card.locator('.library-snippet')).toHaveCount(0);
    }
  }
});

test('youtube shelf follows the playlist file', async ({ page }) => {
  await page.goto('/library/#youtube');
  await expect(page.getByRole('tab', { name: /^YouTube/ })).toHaveAttribute('aria-selected', 'true');

  if (!youtube.videos?.length) {
    await expect(page.getByRole('heading', { name: 'No videos yet.' })).toBeVisible();
    if (youtube.playlistUrl) {
      await expect(page.getByRole('link', { name: 'Open the playlist' })).toHaveAttribute('href', youtube.playlistUrl);
      await expect(page.getByText('It does not have any videos yet.')).toBeVisible();
    } else {
      await expect(page.getByText('A YouTube playlist will show up here.')).toBeVisible();
    }
    await expect(page.locator('#panel-youtube a[href*="youtube.com/watch"]')).toHaveCount(0);
    expect(youtube.playlistUrl || '').not.toContain('si=');
    return;
  }

  if (youtube.playlistUrl) {
    await expect(page.getByRole('link', { name: 'YouTube playlist' })).toHaveAttribute('href', youtube.playlistUrl);
  }
  for (const video of youtube.videos) {
    const card = page.locator('.library-row', {
      has: page.getByRole('heading', { name: video.title, exact: true }),
    });
    await expect(card.getByRole('link', { name: video.title, exact: true })).toHaveAttribute('href', video.url);
    if (video.channel) await expect(card.getByText(video.channel, { exact: true })).toBeVisible();
    if (video.thumbnail) await expect(card.locator('img')).toHaveAttribute('src', video.thumbnail);
    if (video.addedAt) await expect(card.getByText(/^Added /)).toBeVisible();
  }
});

test('arrow keys move between shelves', async ({ page }) => {
  await page.goto('/library/');
  await page.getByRole('tab', { name: /^Reading/ }).focus();
  await expect(page.getByRole('heading', { name: 'Currently reading' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /^Watching/ })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Recent films' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /^YouTube/ })).toBeFocused();
  if (!youtube.videos?.length) {
    await expect(page.getByRole('heading', { name: 'No videos yet.' })).toBeVisible();
  }
});
