---
title: Writing in Markdown
description: One Markdown file, one page. The build turns it into HTML inside the shared layout; nothing runs in the browser.
---

## Why this page exists

Most content on the web is written by people who do not want to write HTML. Markdown is the compromise: readable as text, convertible to markup, easy to store in version control next to the code.

This page is `content-src/light.md`. A script runs before the dev server and the build, parses the front matter at the top of the file, converts the body with a Markdown library, and writes `content/light.html` using the same header and footer as every other page.

## What the pipeline does

1. Reads the front matter (`title`, `description`).
2. Converts Markdown to HTML.
3. Adds `id` attributes to headings so they can be linked to.
4. Wraps the result in the site layout.

That is the whole feature. The heavy variant adds a collection of files, an index page, tags, a table of contents per article, a search index, an RSS feed and a sitemap: the things a content framework ships out of the box.

## What to compare

- Does the framework read Markdown natively, or through a plugin?
- Can components or data be embedded in the content (MDX, Markdoc, Vue in Markdown)?
- Where does syntax highlighting happen: build time or browser?
- Is the rendered page static HTML, or does it hydrate?
