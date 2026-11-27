# Architecture

Static site. Astro 7 compiles pages to HTML in `dist`. GitHub Pages serves that folder. There is no server, database, or paid API in the current tree.

## Stack

- Astro `^7.4.13` (`package.json`), `output: 'static'`, `trailingSlash: 'always'`, `site: https://michaelbrady4.github.io` (`astro.config.mjs`)
- `@astrojs/sitemap` writes `sitemap-index.xml` and `sitemap-0.xml`. Its filter leaves out `/og/` and the 404 page.
- `@resvg/resvg-js` renders the social preview PNGs at build time (see Social previews below)
- Node `>=22.23.4`. The deploy and library workflows pin `22.23.4` because Astro 7 refused an older 22.x patch.
- TypeScript via `astro/tsconfigs/strict` (`tsconfig.json`)
- Playwright `^1.64.1` for browser tests. `playwright.config.js` uses Chrome (`channel: 'chrome'`), `baseURL` `http://127.0.0.1:4321`, and a web server command of `npm run build && npm run preview -- --ignore-lock`. Astro 7 moves `astro preview` to the background when it detects a coding agent, which made Playwright report that the server exited early. `--ignore-lock` turns that off.
- Self-hosted Geist Sans: `public/fonts/geist-latin-wght-normal.woff2`, SIL Open Font License in `public/fonts/OFL.txt`

## Folder map

```
.github/workflows/deploy.yml     build and publish to GitHub Pages
.github/workflows/library.yml    nightly feed sync
docs/                            PRD, architecture, decisions, library setup
public/favicon.svg               gradient orb, also the header mark
public/fonts/                    Geist (woff2, served to browsers)
public/robots.txt                allows everything, points at the sitemap
scripts/library/                 Node fetchers and unit tests
src/assets/michael.jpg           homepage portrait
src/components/                  header, footer, social, project card, stars, Lately strip
src/content/blog/                Markdown posts (empty aside from .gitkeep)
src/data/library/                committed JSON for reading, watching, YouTube
src/layouts/BaseLayout.astro     document shell, theme boot, reveal motion
src/lib/                         date formatting, blog loading, social preview images (og.ts)
src/og/fonts/                    Geist Regular and SemiBold TTF, build time only, for og.ts
src/pages/                       routes
src/projects.ts                  project list
src/site.ts                      name, bio, email, profile links
src/styles/global.css            tokens, layout, components
tests/                           Playwright
```

## Pages and components

| Route | File | What it renders |
| --- | --- | --- |
| `/` | `src/pages/index.astro` | Portrait, bio from `src/site.ts`, social links, Selected projects |
| `/projects/` | `src/pages/projects/index.astro` | Every project in `src/projects.ts` |
| `/library/` | `src/pages/library/index.astro` | Tabs: Reading, Watching, YouTube. Default is Reading. |
| `/blog/` | `src/pages/blog/index.astro` | Post list, or "Posts coming soon." |
| `/blog/<slug>/` | `src/pages/blog/[...slug].astro` | One Markdown post |
| 404 | `src/pages/404.astro` | Missing page |
| `/og/<slug>.png` | `src/pages/og/[...slug].png.ts` | 1200x630 social preview: `home`, `projects`, `library`, `blog`, and `blog/<post id>` |
| `/sitemap-index.xml` | `@astrojs/sitemap` | Sitemap for search engines |

`src/components/ProjectCard.astro` is used on the homepage (`heading="h3"`) and the projects page (default `h2`). A public project (`visibility: 'public'` in `src/projects.ts`) gets a live link and a Code link. A private project gets the live link, the class `is-private`, a lock icon, and the label Private. The card template does not render a GitHub link unless `visibility` is `public`.

`src/components/SiteHeader.astro` is the orb (`/favicon.svg`), the name, Home, Projects, Library, Blog, and the theme button. `SiteFooter.astro` is the copyright line. `SocialLinks.astro` is the homepage row: X profile, LinkedIn, and a copy-email button. Those profile links are not a data feed.

`StarRating.astro` draws 0 to 5 stars, including halves, for books and films. Pass `as="span"` when the stars sit inside inline content such as a link.

`Lately.astro` is the homepage strip between the bio and Selected projects. It reads the same JSON as `/library/`: the first currently reading book (or the latest read book), the first film in `watching.json`, and the first YouTube video when the playlist has one. Each card links to its library tab (`/library/#reading`, `#watching`, `#youtube`). A shelf with no rows is left out, and the section is not rendered when all three are empty.

## Styling and theme

`src/styles/global.css` holds the tokens and component styles. Light tokens sit on `:root`. Dark tokens sit on `[data-theme="dark"]` and, when no stored choice exists, on `prefers-color-scheme: dark`.

`BaseLayout.astro` sets `data-theme` before paint from `localStorage` key `theme`, or from the system preference. The header button toggles `light` and `dark` and writes the choice back. `theme-color` follows the same switch (`#f3f1ec` light, `#0e0f12` dark).

Motion is a short rise (`@keyframes rise`) on `.reveal` and on elements that gain `.reveal` via `IntersectionObserver` in `BaseLayout.astro`. Cards lift a couple of pixels on hover. `prefers-reduced-motion: reduce` collapses animation and transition duration.

Page changes use native cross-document view transitions (`@view-transition { navigation: auto; }` in `global.css`, inside `prefers-reduced-motion: no-preference`). The page crossfades while the header and footer hold still. There is no JavaScript router. Browsers without support navigate normally.

## Social previews and search

`BaseLayout.astro` writes `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`, `og:site_name`, and Twitter `summary_large_image` tags on every page. `ogImagePath()` in `src/lib/og.ts` maps a page path to its image. Unknown paths, such as the 404 page, use `/og/home.png`. A page can pass `ogImage` to override it.

`src/lib/og.ts` draws each card as an SVG with the site tokens (the orb gradient, the two soft glows, Geist, ink and muted colors) and renders it to PNG with resvg. Titles wrap by an estimated character width and shrink in steps for long blog titles. The fixed cards are `staticCards`. Blog post cards use the post title and description.

The homepage passes `jsonLd` to the layout: a schema.org `Person` built only from facts in `src/site.ts` (name, URL, role at C3 AI, the two schools, X and LinkedIn).

The body background is two soft radial gradients (`--glow-cool`, `--glow-warm`). Type is Geist, with a system sans fallback.

## Library data

Committed JSON, not a database:

- `src/data/library/reading.json`: `source` is `widget` today. One currently reading book (The Hunger Games) and 12 read books. Profile `https://www.goodreads.com/user/show/143360526`.
- `src/data/library/watching.json`: 7 films for Letterboxd user `michaelb4`, ordered by watched date, newest first (You Can See Everything on 2026-11-22, then Primetime on 2026-10-22).
- `src/data/library/youtube.json`: playlist id `PLD8-d1TMwYyA`, title Website, `videos` is an empty array.

Library covers are hotlinked from Goodreads, Letterboxd, and YouTube with `loading="lazy"`, `decoding="async"`, and `referrerpolicy="no-referrer"`, so the hidden tabs do not load until they are opened. A small script at the end of `src/pages/library/index.astro` swaps any cover that fails to load for the plain `.library-media-fallback` tile.

`scripts/library/store.mjs` writes a file only when the payload differs. `fetchedAt` is ignored in that comparison, then set when a write happens. The workflow commits only if `git diff` shows a change.

## Nightly action

`.github/workflows/library.yml` (name: Update library):

1. Cron `15 7 * * *` (07:15 UTC) and `workflow_dispatch`.
2. Job `fetch`, with a read-only token and `persist-credentials: false`: `npm ci`, `npm run test:unit`, `node scripts/library/update.mjs` (allowed to fail), then upload the three JSON files as the `library-data` artifact.
3. Job `publish`, with `contents: write` and `actions: write`, and no npm install: download the artifact, check each file parses as JSON, copy it into `src/data/library/`, and commit as `github-actions[bot]` only if something changed.
4. When it committed, `publish` runs `gh workflow run deploy.yml`. A push made with `GITHUB_TOKEN` does not start other workflows, so without this step the new data would sit in `main` and never reach the live site.
5. If the fetch failed, `publish` still commits whatever was written, then exits 1.

`scripts/library/update.mjs` calls:

- `fetchGoodreads()` in `goodreads.mjs`. It requests `https://www.goodreads.com/review/list_rss/143360526?shelf=currently-reading` and `shelf=read`. If the body is not RSS, it loads the public widget at `https://www.goodreads.com/review/custom_widget/143360526.<shelf>`. `reading.json` records `source: "widget"` while RSS is unavailable. An empty result throws, so a failed fetch does not wipe the file.
- `fetchLetterboxd()` in `letterboxd.mjs`. It follows `https://boxd.it/5EEPT` (redirects to `https://letterboxd.com/michaelb4/`) and reads `https://letterboxd.com/michaelb4/rss/`. `sortFilms` orders by `letterboxd:watchedDate`, newest first. A missing watched date uses `pubDate`. `publishedAt` is used only for sorting and is not written to JSON.
- `fetchYouTubePlaylist()` in `youtube.mjs`, only when `playlistId` in `youtube.json` is non-empty. Feed URL: `https://www.youtube.com/feeds/videos.xml?playlist_id=PLD8-d1TMwYyA`. A blank id logs a skip and does not call YouTube. The script does not slice the feed. YouTube itself returns at most the latest 15 videos in that feed (see `docs/library-setup.md`).

`sanitize-url.mjs` strips `utm_*`, `ref`, `s`, `r`, and `token`, and strips `t` unless it looks like a timestamp (`90`, `90s`, `1m30s`). Goodreads review links go through it.

`safeUrl()` in `text.mjs` keeps a link only when it is http or https on an allowed host, and returns it as https. Anything else, including `javascript:` links, becomes null. Goodreads review links must be on `goodreads.com`, covers on `gr-assets.com`, `goodreads.com`, `media-amazon.com`, or `ssl-images-amazon.com`. Letterboxd links must be on `letterboxd.com` or `boxd.it`, posters on `ltrbxd.com`. A book without a safe review link is dropped. A film without a safe link is dropped, and an unsafe poster is left off.

## Tests

- `tests/theme-toggle.spec.js`: theme icon contrast on `/`, `/blog/`, `/projects/`, `/library/`, and the empty blog state.
- `tests/projects.spec.js`: live links, Code links on public cards, no GitHub link on Lorémon or the wedding card, homepage preview.
- `tests/library.spec.js`: three tabs, Reading selected by default, Goodreads rows, Letterboxd order and watched dates, YouTube empty state and playlist link, arrow keys between tabs. Cover requests are answered with a 1x1 PNG so the tests never depend on Goodreads, Letterboxd, or YouTube.
- `tests/home-and-meta.spec.js`: the Lately strip and its tab links, preview image tags and PNG size on each page, the homepage JSON-LD, robots.txt, the sitemap, and lazy covers with the broken-cover fallback.
- `scripts/library/feeds.test.mjs`, `sanitize-url.test.mjs`, `safe-url.test.mjs`, `youtube.test.mjs`: parser and URL tests. `npm run test:unit`.

## Deploy

`.github/workflows/deploy.yml` runs on every push to `main` and on `workflow_dispatch`.

It also runs when the Update library workflow starts it after a data commit (see Nightly action).

1. Checkout (`persist-credentials: false`), Node 22.23.4, `npm ci`.
2. `npm run build`.
3. Upload `dist` with `actions/upload-pages-artifact`.
4. Deploy with `actions/deploy-pages` in the `github-pages` environment.

The user site has no `base` path because the repo is `michaelbrady4.github.io`.
