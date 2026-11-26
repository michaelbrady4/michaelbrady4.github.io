# Product requirements

Living document. When a requirement changes, update the status and the "How it is fulfilled" notes here, add a line to the changelog, and add a dated entry in [DECISIONS.md](DECISIONS.md) if a real choice was made.

## Purpose and audience

This is Michael Brady's personal site: [https://michaelbrady4.github.io](https://michaelbrady4.github.io).

Michael is an AI product manager at C3 AI (`src/site.ts`). The site is a personal brand for a move into consumer AI, aimed at people in San Francisco and New York. It should show the work, the taste, and the writing, in his voice.

The homepage bio is the public introduction. It is four paragraphs in `src/site.ts`: the C3 AI role, agentic products, interest in AI assistants, and degrees from the University of Colorado Boulder and Hood College.

## Requirements

### Sleek, modern, technical look

**Requirement.** Crisp sans serif, soft gradients, subtle motion, and a light/dark toggle.

**Status.** Shipped, 2026-11-26, pull request #4.

**How it is fulfilled.**

- Type: self-hosted Geist in `public/fonts/geist-latin-wght-normal.woff2`, applied in `src/styles/global.css`.
- Gradients: `--glow-cool` and `--glow-warm` on `body::before`.
- Motion: `.reveal` rise, hover lift on cards, orb lift on the header mark. `prefers-reduced-motion: reduce` turns the motion off (`src/styles/global.css`, `src/layouts/BaseLayout.astro`).
- Theme: `data-theme` of `light` or `dark`, stored in `localStorage` key `theme`. The control is the button in `src/components/SiteHeader.astro`.

### Clean, minimal, handmade

**Requirement.** The site should look clean and minimal, and handmade. It should not look like a generic generated template.

**Status.** Shipped as the direction of pull request #4. Ongoing: every later page (projects, library) reuses those tokens and card patterns instead of introducing a new visual system.

**How it is fulfilled.** One stylesheet (`src/styles/global.css`). Shared pieces: `BaseLayout.astro`, `SiteHeader.astro`, `ProjectCard.astro`, library rows in `src/pages/library/index.astro`. No component library and no illustration set.

### No em dashes in copy

**Requirement.** No em dashes in copy or UI text.

**Status.** In force. Agents must keep it (see [AGENTS.md](../AGENTS.md)).

**How it is fulfilled.** There is no linter for the character. Reviews and feed text are stored as the source wrote them. New UI strings and docs are written without the em dash character. Check with a search for that character before a pull request.

### Header mark

**Requirement.** Header is a gradient orb plus the name. It is deliberately distinct from jackraines.blog: no large M monogram, and no photo avatar in the header.

**Status.** Shipped, 2026-11-26, pull request #4.

**How it is fulfilled.** `public/favicon.svg` is the orb (sand `#f6ead6` and `#c9a36c` into blue-gray `#6a88aa` and `#3d5d80`). `src/components/SiteHeader.astro` places that image beside `{site.name}`, which links home. The portrait is only on the homepage (`src/assets/michael.jpg` in `src/pages/index.astro`). The sequence inside #4 (monogram, then photo crop, then name only, then orb) is recorded in [DECISIONS.md](DECISIONS.md).

### Projects

**Requirement.** A Projects section and page. Every card has a short description and a live link. Private repos use a distinct card: a lock, the label Private, and no GitHub link. Public cards also have a Code link.

Current projects:

| Name | Visibility | Live | Code |
| --- | --- | --- | --- |
| What We Watchin? | public | https://what-we-watchin.vercel.app | https://github.com/michaelbrady4/what-we-watchin |
| Lorémon | private | https://loremon.vercel.app | none on the card |
| Valentine 2026 | public | https://valentine-2026-green.vercel.app | https://github.com/michaelbrady4/valentine-2026 |
| Erin & Dom's wedding | private | https://byard-dacunto-wedding.vercel.app | none on the card |

**Status.** Shipped, 2026-11-26, pull request #4.

**How it is fulfilled.** Data: `src/projects.ts`. Card: `src/components/ProjectCard.astro` (`is-private`, lock SVG, "Private", Code link only when `visibility` is `public`). Page: `src/pages/projects/index.astro`. Test: `tests/projects.spec.js`.

### Homepage project preview

**Requirement.** The homepage shows Selected projects, using the same cards, with a link to the full page.

**Status.** Shipped, 2026-11-26, pull request #4.

**How it is fulfilled.** `src/pages/index.astro` section `.project-preview`, heading "Selected projects", link "All projects" to `/projects/`. The same `projects` array and `ProjectCard` (heading level 3).

### Library

**Requirement.** A library page inspired by https://jackraines.blog/library, but clearly distinct from that single dated list. Tabs:

- **Reading.** Goodreads user `143360526`. Shelf RSS was retired in October 2026, so the job uses the public bookshelf widget when RSS is not XML.
- **Watching.** Letterboxd user `michaelb4`, from the RSS at `https://letterboxd.com/michaelb4/rss/` (short link `https://boxd.it/5EEPT`). Sorted by watched date, newest first.
- **YouTube.** Public playlist `PLD8-d1TMwYyA`, title Website. The playlist RSS shows at most the latest 15 videos. The playlist currently has no videos.

**Status.** Shipped. Library in pull request #5 (2026-11-26). Watched-date sort and Reading as the default tab in pull request #6 (2026-11-26).

**How it is fulfilled.**

- Page: `src/pages/library/index.astro`. Tabs are `reading`, `watching`, `youtube`. With no hash, `data-tab` is `reading`.
- Reading data: `src/data/library/reading.json` (`"source": "widget"`, 1 currently reading, 12 read). Fetch: `scripts/library/goodreads.mjs` (RSS first, widget fallback).
- Watching data: `src/data/library/watching.json` (7 films). Fetch and sort: `scripts/library/letterboxd.mjs` (`sortFilms`). The row shows `watchedDate` via `formatDate` in `src/lib/dates.ts`.
- YouTube data: `src/data/library/youtube.json` (`playlistId` `PLD8-d1TMwYyA`, `playlistTitle` `Website`, `videos` empty). Fetch: `scripts/library/youtube.mjs`. The script does not trim the feed. YouTube's own playlist feed returns at most 15 entries. Empty state: "No videos yet." plus "Open the playlist".
- Tests: `tests/library.spec.js` and `scripts/library/*.test.mjs`.

The page is distinct from jackraines.blog/library because that page is one chronological link list. This one is tabbed shelves with covers, ratings, and the site's card styling.

### Nightly data update

**Requirement.** A nightly GitHub Action fetches library data and commits only when something changed. The page never shows invented rows.

**Status.** Shipped, pull requests #5 and #6.

**How it is fulfilled.** `.github/workflows/library.yml` runs at 07:15 UTC and on manual dispatch. `scripts/library/update.mjs` writes JSON through `scripts/library/store.mjs`, which skips the write when the payload matches the file (`fetchedAt` does not count as a change). The workflow commits only when `git diff` is non-empty. Fetchers throw if Goodreads or Letterboxd return nothing, so a bad response does not replace real data with an empty list. YouTube may be a real empty playlist. That empty list is what the feed returned on 2026-11-26, not a placeholder.

### Free hosting only

**Requirement.** Free hosting. GitHub Pages. No paid services, no paid APIs, no paid domain.

**Status.** In force.

**How it is fulfilled.** Deploy is `.github/workflows/deploy.yml` to GitHub Pages. Canonical URL is `https://michaelbrady4.github.io` (`astro.config.mjs`, `src/site.ts`). Library inputs are public RSS and widget URLs. Dependencies are Astro and Playwright only (`package.json`).

### X bookmarks shelf

**Requirement.** A saved-links shelf from X was requested, then withdrawn. Michael decided not to use the paid X API.

**Status.** Removed, 2026-11-26, pull request #6. It had shipped in pull request #5.

**How it is fulfilled.** The current tree has no From X tab, no bookmark JSON, and no X OAuth scripts. `docs/library-setup.md` does not describe an X setup. The homepage profile icon to X remains (`src/site.ts` `links.x`). That is not the bookmarks API.

### Raindrop.io

**Requirement.** Raindrop.io was considered as a source of saved links and declined.

**Status.** Declined. Not built.

**How it is fulfilled.** There is no Raindrop code, secret, or data file. Saved links are not a shelf on the site.

## Out of scope

- A custom domain, analytics vendor, or comments vendor.
- A paid bookmarks or read-later API, including the X bookmarks API and Raindrop.
- Editing project sites from this repo. This repo only links to them.
- User accounts or a CMS. Posts are Markdown files in `src/content/blog/`.

## Known limitations

- The blog has no posts. `/blog/` shows "Posts coming soon." (`src/pages/blog/index.astro`). `src/content/blog/` contains `.gitkeep` only.
- Goodreads review pages require sign-in, so a review on this site is the public widget snippet, linked to the review.
- Goodreads RSS is retired (October 2026). The widget is the fallback until RSS returns XML again.
- Letterboxd RSS is the recent diary, not the full film history.
- YouTube's playlist feed returns at most the latest 15 videos. The Website playlist (`PLD8-d1TMwYyA`) currently has zero videos, so the tab is an empty state with a link to the playlist.
- The library JSON is whatever the last successful fetch wrote. It does not update until the Action runs or someone runs `node scripts/library/update.mjs`.
- There is no automated check that forbids an em dash. It is a review rule.

## Open ideas

**Writings.** Host the posts on this site. Use Substack or beehiiv only as the email list. Cross-posts should point back to the canonical post here. The blog route and Markdown collection already exist (`src/content.config.ts`, `src/lib/posts.ts`). There is no email-provider integration in the repo.

Other ideas belong in this section only after Michael asks for them. Do not treat this list as approval to build.

## Changelog

### 2026-11-26

- Pull request #4. Redesign: Geist, gradients, motion, light/dark toggle, orb header, Projects page and homepage preview, public and private cards.
- Pull request #5. Library page: Reading (Goodreads), Watching (Letterboxd), YouTube, and a From X bookmarks shelf with a nightly Action.
- Pull request #6. Watching sorted by watched date, newest first. From X shelf, X scripts, bookmark JSON, and X setup docs removed. Reading is the default tab.

The November work is these three pull requests, all dated 2026-11-26 in git. The site itself started earlier: pull requests #1 to #3 landed on 2026-10-22 and 2026-10-23 (Astro site, Node pin, theme icon). Nothing in git is dated 2026-11-25.

## How to keep this updated

After a change merges:

1. If a requirement's behavior changed, edit its status and the file list in this document.
2. Add a changelog bullet with the date and pull request number.
3. If you chose between options, add a dated entry in [DECISIONS.md](DECISIONS.md).
4. If routes, data files, or workflows changed, update [ARCHITECTURE.md](ARCHITECTURE.md).
5. If the library feeds changed, update [library-setup.md](library-setup.md).

Do this in the same pull request as the change.
