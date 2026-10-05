---
title: Measuring a framework
description: The numbers to collect for every implementation, and how to collect them the same way each time.
date: 2026-06-30
tags: [method, performance]
---

## Build output

Run the production build and record, per page, the bytes of JavaScript and CSS the page loads. Group chunks by entry; shared chunks count once per page that loads them. Use gzip sizes, since that is what travels.

```sh
pnpm build
du -b dist/assets/* | sort -n
```

## Lines of code

Count only files that exist because of the page: the route file, its components, its styles. Configuration counts once for the project, not per page.

## Lighthouse

Mobile preset, throttled CPU and network, three runs, take the median. The static and dynamic pages are the ones worth the time.

## Timings the pages print

The client state, real-time and data grid pages measure their own rendering and show the number on screen. Record it after the same action in every implementation: add 300 cards, run at 30 Hz for ten seconds, sort fifty thousand rows.

## Decisions made for you

While porting, keep a list of things the framework decided: where the page renders, how data is cached, how errors surface. This list is the most useful output of the survey and the easiest one to forget to write.
