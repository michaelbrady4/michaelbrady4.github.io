import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

function readJson(name) {
  return JSON.parse(readFileSync(new URL(`../src/data/library/${name}`, import.meta.url), 'utf8'));
}

const bookmarks = readJson('bookmarks.json');
const reading = readJson('reading.json');
const watching = readJson('watching.json');

test('library is in the nav and the three shelves are tabs', async ({ page }) => {
  await page.goto('/library/');
  await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
  await expect(page.getByText('Links, books, and films I want to remember.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Library', exact: true })).toHaveAttribute('aria-current', 'page');

  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(0)).toHaveText(/Saved/);
  await expect(tabs.nth(1)).toHaveText(/Reading/);
  await expect(tabs.nth(2)).toHaveText(/Watching/);
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

  const chrome = await page
    .locator('h1, .library-lede, .library-tabs, .library-kicker, .library-empty')
    .evaluateAll((nodes) => nodes.map((node) => node.textContent).join('\n'));
  expect(chrome).not.toContain('\u2014');
});

test('saved shelf follows the bookmark file', async ({ page }) => {
  await page.goto('/library/');
  if (bookmarks.folders.length === 0) {
    await expect(page.getByRole('heading', { name: 'Nothing saved yet.' })).toBeVisible();
    await expect(page.getByText('Links from X will show up here, grouped by topic.')).toBeVisible();
    return;
  }

  for (const folder of bookmarks.folders) {
    await expect(page.getByRole('heading', { name: folder.name, exact: true })).toBeVisible();
    for (const item of folder.items) {
      const link = page.getByRole('link', { name: item.title, exact: true });
      await expect(link).toHaveAttribute('href', item.url);
      await expect(link).toContainText(item.domain);
      if (item.note) await expect(link).toContainText(item.note);
      expect(item.url).not.toMatch(/[?&](utm_|ref=|token=)/);
    }
  }
});

test('reading shelf shows the Goodreads data', async ({ page }) => {
  await page.goto('/library/#reading');
  await expect(page.getByRole('tab', { name: /^Reading/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Nothing saved yet.' })).toBeHidden();
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

  for (const film of watching.films) {
    const card = page.locator('.library-row', {
      has: page.getByRole('heading', { name: film.title, exact: true }),
    });
    await expect(card.getByRole('link', { name: film.title, exact: true })).toHaveAttribute('href', film.url);
    if (film.year) await expect(card.getByText(String(film.year), { exact: true })).toBeVisible();
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

test('arrow keys move between shelves', async ({ page }) => {
  await page.goto('/library/');
  await page.getByRole('tab', { name: /^Saved/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /^Reading/ })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Currently reading' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /^Watching/ })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Recent films' })).toBeVisible();
});
