import { defineConfig } from 'astro/config';

// User site: https://michaelbrady4.github.io (repo name matches the *.github.io pattern, so no base path).
export default defineConfig({
  site: 'https://michaelbrady4.github.io',
  output: 'static',
  trailingSlash: 'always',
});
