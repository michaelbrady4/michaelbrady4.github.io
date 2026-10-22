# Michael Brady

My personal website to track and write about whatever I am currently learning about.

Published at <https://michaelbrady4.github.io>.

## Edit the site

Name, bio, email, and profile links are in [`src/site.ts`](src/site.ts). The home page photo is [`src/assets/michael.jpg`](src/assets/michael.jpg). A square photo about 600 pixels wide is enough; the site displays it as a small circle.

## Write a post

Posts are Markdown files in [`src/content/blog/`](src/content/blog/). Adding a post is adding a file. You can do that from the github.com editor: open the folder, choose **Add file**, and commit to `main`.

The file name becomes the URL. `notes-from-the-week.md` is published at `/blog/notes-from-the-week/`.

Start the file with this frontmatter:

```yaml
---
title: Notes from the week
date: 2026-10-22
description: Optional one-line summary for the blog list.
---
```

`title` and `date` are required. `description` is optional. Use a `YYYY-MM-DD` date. The blog lists posts newest first. Write the post in Markdown under the frontmatter.

Pushing that file to `main` runs the GitHub Actions workflow, which builds the site and deploys it.

## Local preview

```bash
npm install
npm run dev
```

`npm run build` writes the static site to `dist/`.

## GitHub Pages

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds the Astro site on every push to `main` and deploys it with `actions/upload-pages-artifact` and `actions/deploy-pages`.

Before the first deploy, open the repository **Settings → Pages** and set **Source** to **GitHub Actions**. The workflow cannot publish until that is selected.

This repository is private. GitHub Free only publishes Pages from public repositories. GitHub Pro can publish from a private personal repository, and the site at `michaelbrady4.github.io` is still public on the internet. A login-gated Pages site is an organization feature on GitHub Enterprise Cloud, not something a personal user site can do. If this account is on GitHub Free, make the repository public or the site will not come online.
