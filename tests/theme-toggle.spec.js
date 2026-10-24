import { expect, test } from '@playwright/test';

async function iconState(page) {
  return page.locator('#theme-toggle').evaluate(async (button) => {
    const svg = [...button.querySelectorAll('svg')].find(
      (el) => getComputedStyle(el).display !== 'none',
    );
    const parse = (value) => {
      const match = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
    };
    const linear = (channel) => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const lum = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    const contrastOf = (a, b) => {
      const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
      return (hi + 0.05) / (lo + 0.05);
    };

    if (!svg) return { pixels: 0, contrast: 0, theme: document.documentElement.dataset.theme };

    const color = getComputedStyle(button).color;
    const background = getComputedStyle(document.body).backgroundColor;
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '18');
    clone.setAttribute('height', '18');
    for (const el of [clone, ...clone.querySelectorAll('*')]) {
      for (const attr of ['fill', 'stroke']) {
        if (el.getAttribute(attr) === 'currentColor') el.setAttribute(attr, color);
      }
    }
    const xml = new XMLSerializer().serializeToString(clone);
    const image = new Image();
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
    const canvas = document.createElement('canvas');
    canvas.width = 18;
    canvas.height = 18;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, 18, 18);
    const pixels = ctx.getImageData(0, 0, 18, 18).data;
    let painted = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 20) painted += 1;
    }
    const fg = parse(color);
    const bg = parse(background);
    return {
      pixels: painted,
      contrast: fg && bg ? contrastOf(fg, bg) : 0,
      color,
      background,
      theme: document.documentElement.dataset.theme,
      icon: svg.getAttribute('class'),
    };
  });
}

async function expectVisibleIcon(page) {
  const state = await iconState(page);
  expect(state.pixels, JSON.stringify(state)).toBeGreaterThan(40);
  expect(state.contrast, JSON.stringify(state)).toBeGreaterThan(4.5);
}

async function fresh(page, path, scheme) {
  await page.emulateMedia({ colorScheme: scheme });
  await page.goto(path);
  await page.evaluate(() => localStorage.removeItem('theme'));
  await page.reload();
}

test('toggle icon stays visible from a light preference', async ({ page }) => {
  for (const path of ['/blog/', '/']) {
    await fresh(page, path, 'light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expectVisibleIcon(page);
    await page.getByRole('button', { name: /theme/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expectVisibleIcon(page);
    await page.getByRole('button', { name: /theme/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expectVisibleIcon(page);
  }
});

test('toggle icon stays visible from a dark preference', async ({ page }) => {
  for (const path of ['/blog/', '/']) {
    await fresh(page, path, 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expectVisibleIcon(page);
    await page.getByRole('button', { name: /theme/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expectVisibleIcon(page);
    await page.getByRole('button', { name: /theme/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expectVisibleIcon(page);
  }
});

test('blog shows an empty state when there are no posts', async ({ page }) => {
  await page.goto('/blog/');
  await expect(page.getByRole('heading', { level: 1, name: 'Blog' })).toBeVisible();
  await expect(page.getByText('Posts coming soon.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How to add a new post' })).toHaveCount(0);
  await expect(page.locator('.post-list')).toHaveCount(0);
});
