---
title: How to add a new post
date: 2026-10-22
description: Add a Markdown file in src/content/blog and it shows up on this page.
---

New posts are Markdown files. You can write one from the github.com website. Nothing else has to be installed.

## Create a file

Add a file in `src/content/blog/`, for example `notes-from-the-week.md`. The file name is the address, so that example is published at `/blog/notes-from-the-week/`.

On github.com, open the `src/content/blog/` folder and choose **Add file**.

## Add the frontmatter

The top of the file is a short block of fields. `title` and `date` are required. `description` is optional and is shown under the title on the blog list.

```yaml
---
title: Notes from the week
date: 2026-10-22
description: Optional one-line summary for the blog list.
---
```

Write the date as `YYYY-MM-DD`. Posts are listed newest first using that date.

## Write in Markdown

Everything under the frontmatter is the post. Paragraphs, lists, links, and code all work.

- Keep the file in `src/content/blog/`.
- Commit it to the `main` branch.
- GitHub Actions builds the site and publishes it.

## Preview locally

A local preview is optional. From a clone of the repo:

```bash
npm install
npm run dev
```

The name, bio, email, and profile links live in `src/site.ts`, separate from the posts. The home page photo is `src/assets/michael.jpg`.
