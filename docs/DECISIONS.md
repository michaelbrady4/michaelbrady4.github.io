# Decisions

Dated choices that are easy to undo if the reason is forgotten. Dates are the git dates of the commits that landed them, unless noted as a product choice with no code.

## 2026-10-22: Static Astro site on GitHub Pages

The site is a static Astro project deployed by GitHub Actions to GitHub Pages (`582998f`, pull request #1). Hosting stays on the free `github.io` URL. There is no custom domain in `astro.config.mjs` or `src/site.ts`.

## 2026-10-22: Light and dark theme with a nav toggle

`196b4fd` added a theme control. The current implementation stores `light` or `dark` in `localStorage` under `theme`, sets `data-theme` before paint, and follows the system preference when nothing is stored. See `src/layouts/BaseLayout.astro` and `src/components/SiteHeader.astro`.

## 2026-11-26: Quieter redesign, Geist, soft gradients, small motion

Pull request #4 (`1c1eb0b`) restyled the site. Geist is self-hosted. The page background uses two soft radial gradients. Motion is a short rise and a small hover lift, and it stops under `prefers-reduced-motion`. The aim recorded in that work is a quiet, sharp personal site: clean, minimal, and handmade, rather than a generic generated layout.

## 2026-11-26: Header is the gradient orb and the name

The merged commit message for #4 records this sequence, all inside that one pull request:

1. A header monogram was replaced by a circular crop of the portrait.
2. The portrait was removed so the header was the name alone.
3. A small gradient orb was placed beside the name.

The orb is `public/favicon.svg` (sand into blue-gray). `src/components/SiteHeader.astro` shows that image and `site.name`. It does not show a large M, and it does not show a photo. The portrait stays on the homepage only (`src/pages/index.astro`, `src/assets/michael.jpg`). The mark is meant to be distinct from jackraines.blog, which had been a reference point for a monogram-style header.

## 2026-11-26: Project cards, with a private variant

`src/projects.ts` is the only project list. `src/components/ProjectCard.astro` always links to the live site. Public projects also link to GitHub. Private projects (`Lorémon`, `Erin & Dom's wedding`) use `visibility: 'private'`, the class `is-private`, a lock icon, and the word Private. The template has no Code link in that branch, so those cards do not point at a GitHub repo. The same cards appear under Selected projects on the homepage.

## 2026-11-26: Library is tabs, not a single dated list

Pull request #5 added `/library/`. jackraines.blog/library was the reference: a long list of saved links. This page uses three tabs (Reading, Watching, YouTube) and the site's existing cards, covers, and ratings, so it is not a copy of that list.

## 2026-11-26: Goodreads uses the public widget when RSS 404s

`scripts/library/goodreads.mjs` requests the shelf RSS for user `143360526` first. On 26 Nov 2026 those URLs returned Goodreads' not-found page. Goodreads had retired RSS in October 2026 (linked from `docs/library-setup.md`). The script then reads the public bookshelf widget for `currently-reading` and `read`. `src/data/library/reading.json` has `"source": "widget"`. If Goodreads returns RSS again, the same script will use it.

## 2026-11-26: X bookmarks shelf removed because the API is paid

Pull request #5 shipped a From X tab, OAuth refresh, `scripts/library/authorize.mjs`, `scripts/library/x-bookmarks.mjs`, `scripts/library/github.mjs`, and `src/data/library/bookmarks.json` plus `bookmark-folders.json`. The X API charges per read. Michael decided not to use it. Pull request #6 deleted those files, the tab, the secrets step in `.github/workflows/library.yml`, and the X sections of `docs/library-setup.md`.

The homepage still has a profile icon to `https://x.com/brady__michael` (`src/site.ts`, `src/components/SocialLinks.astro`). That is a link, not an API.

## 2026-11-26: Raindrop.io declined

Michael considered Raindrop.io as a place to keep saved links and declined it. The repo has no Raindrop client, token, config, or data file.

## 2026-11-26: Watching sorts by watched date

Letterboxd's RSS order is publish order, which put Primetime (watched 2026-10-22) above You Can See Everything (watched 2026-11-22). Pull request #6 sorts in `sortFilms` (`scripts/library/letterboxd.mjs`) by `letterboxd:watchedDate`, newest first. If that date is missing, the sort uses `pubDate`. The watched date is shown on the row in `src/pages/library/index.astro`. `src/data/library/watching.json` was regenerated in that order.

## 2026-11-27: Nightly library job starts the deploy, in two jobs

GitHub does not start other workflows from a push made with `GITHUB_TOKEN`. The library job pushed new data to `main`, but `deploy.yml` never ran, so the live site would have stayed on old data. The job now runs `gh workflow run deploy.yml` after a commit (`actions: write`). It was also split: `fetch` installs npm packages with a read-only token, and `publish` commits with write access and installs nothing, so a bad dependency cannot push to `main`.

## 2026-11-27: Feed links are limited to known hosts

`safeUrl` in `scripts/library/text.mjs` keeps only http and https links on the Goodreads, Letterboxd, and their image hosts, so a feed cannot put a `javascript:` link or an off-site image on the page. Astro escapes attributes but does not block those schemes.

## 2026-11-27: Social preview images are SVG rendered by resvg

Satori was tried first. It pulled in `fflate` with a moderate advisory, so the cards are a hand-written SVG in `src/lib/og.ts` rendered by `@resvg/resvg-js`. resvg needs TTF, so Geist Regular and SemiBold TTF from the `geist` npm package (SIL OFL) are committed in `src/og/fonts/`. Installing `geist` itself was avoided because it lists Next.js as a peer dependency. The cards use the light palette.

## 2026-11-27: Homepage Lately strip from library data

Michael asked for a small "now" signal on the homepage. It reads the committed library JSON instead of new data, so it follows the rule against invented rows and updates with the nightly job.

## 2026-11-27: Native view transitions, not the Astro router

Page crossfades use CSS `@view-transition` with no JavaScript. Astro's `ClientRouter` would swap the `<html>` element, which resets `data-theme` and re-runs inline scripts, so the theme and library tab code would need extra handling. Browsers without support navigate as before.

## 2026-11-27: Playwright preview server uses `--ignore-lock`

Astro 7 starts `astro preview` in the background when it detects a coding agent. Playwright then saw the process exit and stopped with "Process from config.webServer exited early". `--ignore-lock` is Astro's documented way to keep it in the foreground. Only `playwright.config.js` uses it. `npm run preview` is unchanged.

## 2026-11-26: Reading is the default library tab

After From X was removed, `/library/` opens on Reading (`data-tab="reading"` in `src/pages/library/index.astro`). Watching and YouTube stay one hash away (`#watching`, `#youtube`).
