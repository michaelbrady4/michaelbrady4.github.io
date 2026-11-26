# Agent rules

Rules for any coding agent working in this repo. Michael Brady owns the site. Read [docs/PRD.md](docs/PRD.md) before changing product behavior.

## Copy

Do not put an em dash in copy, UI text, docs, or commit messages. Use a period, a comma, a colon, or a hyphen.

## Design

Match the current site. Geist, the existing color tokens in `src/styles/global.css`, soft gradients, and small motion that respects `prefers-reduced-motion`. Keep it clean, minimal, and handmade. Do not introduce a second visual system, a stock illustration set, or a layout copied from another person's site.

The header mark is the gradient orb (`public/favicon.svg`) plus the name. Do not put a large M monogram or a photo in the header.

## Free only

Hosting is GitHub Pages on `https://michaelbrady4.github.io`. Do not add a paid API, a paid host, a paid font, or a paid domain. Public RSS and widget feeds are fine.

## Data

Never invent library rows, reviews, ratings, or project facts. If a feed is empty or fails, keep the last real file or show the empty state the page already has. Say what the feed returned.

## Before a pull request

1. `npm run build` must pass.
2. `npm test` (Playwright) must pass. Run `npm run test:unit` too when you touch `scripts/library/`.
3. For a UI change, capture screenshots in light and dark, desktop and mobile, of each screen you changed.
4. Update [docs/PRD.md](docs/PRD.md) and [docs/DECISIONS.md](docs/DECISIONS.md) in the same pull request when behavior or a decision changes. Update [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) when routes, data files, or workflows change.

## Git

Do not merge a pull request unless Michael explicitly says to merge it.

Do not force-push unless Michael explicitly says to force-push.
