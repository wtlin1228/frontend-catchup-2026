---
title: The URL is state
description: Which state belongs in the address bar, which belongs in memory, and how routers help or get in the way.
date: 2026-08-18
tags: [routing, state]
---

## Two kinds of state

Search text, page number, selected tab, the open item: if it should survive a refresh or be sent to a colleague, it belongs in the URL. Scroll position, a half-typed comment, a hover state: ephemeral, keep it in memory.

## How routers differ

Some routers treat search parameters as typed, validated state (TanStack Router). Some key data loading on the URL so that navigation and fetching are one thing (React Router, SvelteKit, Nuxt). Some give you a path and leave the rest to you.

## The baseline's choice

The dynamic page keeps its search and page number in the hash. The search box writes to the URL with `replaceState` so the input keeps focus; pagination links are plain anchors so the router re-runs the view.

## Questions for the survey

- Does the router re-render the whole route when only a query parameter changes?
- Can a link prefetch its target?
- Does navigation cancel the previous request?
- What does the router do for screen readers when the page changes?
