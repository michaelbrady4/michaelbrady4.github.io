import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// User site: https://michaelbrady4.github.io (repo name matches the *.github.io pattern, so no base path).
export default defineConfig({
  site: 'https://michaelbrady4.github.io',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.includes('/og/') && !page.includes('/404') })],
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
    },
  },
});
