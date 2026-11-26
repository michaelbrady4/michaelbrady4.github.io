# Architecture

Static site. Astro 7 compiles pages to HTML in `dist`. GitHub Pages serves that folder. There is no server, database, or paid API in the current tree.

## Stack

- Astro `^7.4.2` (`package.json`), `output: 'static'`, `trailingSlash: 'always'`, `site: https://michaelbrady4.github.io` (`astro.config.mjs`)
- Node `>=22.23.4`. The deploy and library workflows pin `22.23.4` because Astro 7 refused an older 22.x patch.
- TypeScript via `astro/tsconfigs/strict` (`tsconfig.json`)
- Playwright `^1.64.1` for browser tests. `playwright.config.js` uses Chrome (`channel: 'chrome'`), `baseURL` `http://127.0.0.1:4321`, and a web server command of `npm run build && npm run preview`.
- Self-hosted Geist Sans: `public/fonts/geist-latin-wght-normal.woff2`, SIL Open Font License in `public/fonts/OFL.txt`

## Folder map

```
.github/workflows/deploy.yml     build and publish to GitHub Pages
.github/workflows/library.yml    nightly feed sync
docs/                            PRD, architecture, decisions, library setup
public/favicon.svg               gradient orb, also the header mark
public/fonts/                    Geist
scripts/library/                 Node fetchers and unit tests
src/assets/michael.jpg           homepage portrait
src/components/                  header, footer, social, project card, stars
src/content/blog/                Markdown posts (empty aside from .gitkeep)
src/data/library/                committed JSON for reading, watching, YouTube
src/layouts/BaseLayout.astro     document shell, theme boot, reveal motion
src/lib/                         date formatting and blog loading
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

`src/components/ProjectCard.astro` is used on the homepage (`heading="h3"`) and the projects page (default `h2`). A public project (`visibility: 'public'` in `src/projects.ts`) gets a live link and a Code link. A private project gets the live link, the class `is-private`, a lock icon, and the label Private. The card template does not render a GitHub link unless `visibility` is `public`.

`src/components/SiteHeader.astro` is the orb (`/favicon.svg`), the name, Home, Projects, Library, Blog, and the theme button. `SiteFooter.astro` is the copyright line. `SocialLinks.astro` is the homepage row: X profile, LinkedIn, and a copy-email button. Those profile links are not a data feed.

`StarRating.astro` draws 0 to 5 stars, including halves, for books and films.

## Styling and theme

`src/styles/global.css` holds the tokens and component styles. Light tokens sit on `:root`. Dark tokens sit on `[data-theme="dark"]` and, when no stored choice exists, on `prefers-color-scheme: dark`.

`BaseLayout.astro` sets `data-theme` before paint from `localStorage` key `theme`, or from the system preference. The header button toggles `light` and `dark` and writes the choice back. `theme-color` follows the same switch (`#f3f1ec` light, `#0e0f12` dark).

Motion is a short rise (`@keyframes rise`) on `.reveal` and on elements that gain `.reveal` via `IntersectionObserver` in `BaseLayout.astro`. Cards lift a couple of pixels on hover. `prefers-reduced-motion: reduce` collapses animation and transition duration.

The body background is two soft radial gradients (`--glow-cool`, `--glow-warm`). Type is Geist, with a system sans fallback.

## Library data

Committed JSON, not a database:

- `src/data/library/reading.json`: `source` is `widget` today. One currently reading book (The Hunger Games) and 12 read books. Profile `https://www.goodreads.com/user/show/143360526`.
- `src/data/library/watching.json`: 7 films for Letterboxd user `michaelb4`, ordered by watched date, newest first (You Can See Everything on 2026-11-22, then Primetime on 2026-10-22).
- `src/data/library/youtube.json`: playlist id `PLD8-d1TMwYyA`, title Website, `videos` is an empty array.

`scripts/library/store.mjs` writes a file only when the payload differs. `fetchedAt` is ignored in that comparison, then set when a write happens. The workflow commits only if `git diff` shows a change.

## Nightly action

`.github/workflows/library.yml` (name: Update library):

1. Cron `15 7 * * *` (07:15 UTC) and `workflow_dispatch`.
2. `npm ci`, then `npm run test:unit`.
3. `node scripts/library/update.mjs`.
4. If `reading.json`, `watching.json`, or `youtube.json` changed, commit as `github-actions[bot]` and push.
5. If the fetch step failed, the job still tries to commit whatever was written, then exits 1.

`scripts/library/update.mjs` calls:

- `fetchGoodreads()` in `goodreads.mjs`. It requests `https://www.goodreads.com/review/list_rss/143360526?shelf=currently-reading` and `shelf=read`. If the body is not RSS, it loads the public widget at `https://www.goodreads.com/review/custom_widget/143360526.<shelf>`. `reading.json` records `source: "widget"` while RSS is unavailable. An empty result throws, so a failed fetch does not wipe the file.
- `fetchLetterboxd()` in `letterboxd.mjs`. It follows `https://boxd.it/5EEPT` (redirects to `https://letterboxd.com/michaelb4/`) and reads `https://letterboxd.com/michaelb4/rss/`. `sortFilms` orders by `letterboxd:watchedDate`, newest first. A missing watched date uses `pubDate`. `publishedAt` is used only for sorting and is not written to JSON.
- `fetchYouTubePlaylist()` in `youtube.mjs`, only when `playlistId` in `youtube.json` is non-empty. Feed URL: `https://www.youtube.com/feeds/videos.xml?playlist_id=PLD8-d1TMwYyA`. A blank id logs a skip and does not call YouTube. The script does not slice the feed. YouTube itself returns at most the latest 15 videos in that feed (see `docs/library-setup.md`).

`sanitize-url.mjs` strips `utm_*`, `ref`, `s`, `r`, and `token`, and strips `t` unless it looks like a timestamp (`90`, `90s`, `1m30s`). Goodreads review links go through it.

## Tests

- `tests/theme-toggle.spec.js`: theme icon contrast on `/`, `/blog/`, `/projects/`, `/library/`, and the empty blog state.
- `tests/projects.spec.js`: live links, Code links on public cards, no GitHub link on Lorémon or the wedding card, homepage preview.
- `tests/library.spec.js`: three tabs, Reading selected by default, Goodreads rows, Letterboxd order and watched dates, YouTube empty state and playlist link, arrow keys between tabs.
- `scripts/library/feeds.test.mjs`, `sanitize-url.test.mjs`, `youtube.test.mjs`: parser and URL tests. `npm run test:unit`.

## Deploy

`.github/workflows/deploy.yml` runs on every push to `main` and on `workflow_dispatch`.

1. Checkout, Node 22.23.4, `npm ci`.
2. `npm run build`.
3. Upload `dist` with `actions/upload-pages-artifact`.
4. Deploy with `actions/deploy-pages` in the `github-pages` environment.

The user site has no `base` path because the repo is `michaelbrady4.github.io`.
