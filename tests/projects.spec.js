import { expect, test } from '@playwright/test';

const publicProjects = [
  {
    name: 'What We Watchin?',
    url: 'https://what-we-watchin.vercel.app',
    code: 'https://github.com/michaelbrady4/what-we-watchin',
  },
  {
    name: 'Valentine 2026',
    url: 'https://valentine-2026-green.vercel.app',
    code: 'https://github.com/michaelbrady4/valentine-2026',
  },
];

const privateProjects = [
  {
    name: 'Lorémon',
    url: 'https://loremon.vercel.app',
  },
  {
    name: "Erin & Dom's wedding",
    url: 'https://byard-dacunto-wedding.vercel.app',
  },
];

function card(page, name) {
  return page.locator('.project-card', { has: page.getByRole('heading', { name, exact: true }) });
}

test('projects page lists live links and keeps private repos off GitHub', async ({ page }) => {
  await page.goto('/projects/');
  await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
  await expect(page.locator('.project-card')).toHaveCount(4);
  await expect(page.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute('aria-current', 'page');

  for (const project of publicProjects) {
    const item = card(page, project.name);
    await expect(item.locator('.project-description')).not.toBeEmpty();
    await expect(item.getByRole('link', { name: `Live site for ${project.name}` })).toHaveAttribute(
      'href',
      project.url,
    );
    await expect(item.getByRole('link', { name: `Code for ${project.name}` })).toHaveAttribute(
      'href',
      project.code,
    );
    await expect(item.getByText('Private', { exact: true })).toHaveCount(0);
  }

  for (const project of privateProjects) {
    const item = card(page, project.name);
    await expect(item).toHaveClass(/is-private/);
    await expect(item.locator('.project-description')).not.toBeEmpty();
    await expect(item.getByText('Private', { exact: true })).toBeVisible();
    await expect(item.getByRole('link', { name: `Live site for ${project.name}` })).toHaveAttribute(
      'href',
      project.url,
    );
    await expect(item.locator('a[href*="github.com"]')).toHaveCount(0);
    await expect(item.getByRole('link', { name: /Code/ })).toHaveCount(0);
  }

  const githubHrefs = await page.locator('a[href*="github.com"]').evaluateAll((links) =>
    links.map((link) => link.getAttribute('href')),
  );
  expect(githubHrefs).toEqual([
    'https://github.com/michaelbrady4/what-we-watchin',
    'https://github.com/michaelbrady4/valentine-2026',
  ]);
});

test('homepage previews the same projects', async ({ page }) => {
  await page.goto('/');
  const preview = page.locator('.project-preview');
  await expect(preview.getByRole('heading', { level: 2, name: 'Selected projects' })).toBeVisible();
  await expect(preview.getByRole('link', { name: 'All projects' })).toHaveAttribute('href', '/projects/');
  await expect(preview.locator('.project-card')).toHaveCount(4);
  await expect(preview.getByRole('heading', { name: 'What We Watchin?' })).toBeVisible();
  await expect(preview.getByRole('heading', { name: 'Lorémon' })).toBeVisible();
  await expect(preview.locator('a[href*="github.com/michaelbrady4/what-we-watchin"]')).toHaveCount(1);
  await expect(preview.locator('a[href*="loremon"][href*="github.com"]')).toHaveCount(0);
  await expect(preview.locator('a[href*="byard-dacunto"][href*="github.com"]')).toHaveCount(0);
});
