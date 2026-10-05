---
title: Hydration, islands and resumability
description: Three answers to the same question, which is what the browser has to do before a server-rendered page becomes interactive.
date: 2026-03-02
tags: [rendering, performance]
---

## The cost of hydration

A server-rendered page arrives as HTML and paints at once. To respond to a click, the browser then has to download the component code, run it, rebuild the component tree in memory and attach event handlers to markup that already exists. That work is hydration, and on a slow phone it is the longest part of the load.

| Approach | JavaScript shipped | Interactive when |
| --- | --- | --- |
| Full hydration | The whole app | After all of it has run |
| Islands | Only interactive components | Per island, on its own schedule |
| Resumability | Handlers on demand | Immediately, in principle |

## Islands

An island is an interactive component surrounded by static HTML. Each island decides when it loads: on page load, when it scrolls into view, when the browser is idle, or only on the client. Astro made the term mainstream; Fresh and Marko use the same idea.

The cost is coordination. Islands do not share a component tree, so state that two of them need has to live in a store, in the URL, or in the DOM.

## Resumability

Resumability skips the re-run. The server serialises enough state and enough information about event handlers that the browser can continue where the server left off, loading handler code only when an event fires. Qwik is built on this.

```js
// Qwik: the $ marks a boundary the compiler can lazy-load
export const Counter = component$(() => {
  const count = useSignal(0);
  return <button onClick$={() => count.value++}>{count.value}</button>;
});
```

## What to measure

Time to interactive on the dynamic page, the size of the first JavaScript chunk, and how long the main thread is busy after first paint. The static pages are the control: they should show nothing at all.
