# Michael Brady

Personal site for Michael Brady, an AI product manager. Live at [https://michaelbrady4.github.io](https://michaelbrady4.github.io).

The site is a static [Astro](https://astro.build) project. GitHub Pages hosts it. There is no paid API, paid host, or custom domain in this repo.

## Pages

- Home, with a short bio, a Lately strip (current book and latest film from the library), and a Selected projects preview
- [Projects](https://michaelbrady4.github.io/projects/)
- [Library](https://michaelbrady4.github.io/library/): Reading, Watching, and YouTube
- [Blog](https://michaelbrady4.github.io/blog/): Markdown posts, empty until one is added

## Run locally

Node `22.23.4` or newer.

```bash
npm ci
npm run dev
```

The dev server prints a local URL. Other commands:

```bash
npm run build
npm run preview
npm test
npm run test:unit
```

`npm test` builds the site, starts the preview server, and runs Playwright in Chrome. `npm run test:unit` runs the library feed parsers with Node's test runner.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds with `npm run build` and publishes `dist` through GitHub Pages. In the repo, Settings, Pages, Source must be GitHub Actions.

A second workflow, Update library, runs nightly at 07:15 UTC and can be started by hand. It refreshes Goodreads, Letterboxd, and YouTube JSON, commits only when the content changed, and then starts the deploy.

Each page gets a social preview image at `/og/<page>.png`, built from `src/lib/og.ts`. The build also writes `sitemap-index.xml`.

## Docs

- [docs/PRD.md](docs/PRD.md): what the site is for, and how each requirement is met
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): stack, folders, data flow, tests, deploy
- [docs/DECISIONS.md](docs/DECISIONS.md): dated choices and why
- [docs/library-setup.md](docs/library-setup.md): how the library feeds are configured
- [AGENTS.md](AGENTS.md): rules for coding agents
