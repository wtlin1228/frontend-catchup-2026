---
title: Three reactivity models
description: Virtual DOM diffing, compiled updates and fine-grained signals, with the same counter written in each.
date: 2026-04-14
tags: [reactivity, state]
---

## Re-render and diff

Describe the UI as a function of state. When state changes, run the function again and diff the result against the previous one. React, Preact and Vue's default renderer work this way; the diff is the price of the model, and compilers now spend most of their effort avoiding the re-run.

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

## Compile the updates

Analyse the template at build time and emit code that updates exactly the DOM nodes a piece of state touches. No diff at runtime. Svelte pioneered this; Vue's Vapor mode and Solid's compiled JSX are related.

```svelte
<script>
  let count = $state(0);
</script>
<button onclick={() => count++}>{count}</button>
```

## Fine-grained signals

A signal is a value with subscribers. A computed value subscribes to signals; an effect subscribes and performs a side effect such as writing to a text node. When a signal changes, only its subscribers run. Solid, Preact Signals, Angular and Vue's refs are all variations.

```js
const count = signal(0);
effect(() => { button.textContent = count.value; });
button.onclick = () => count.value++;
```

## Which one wins

None, in general. Re-render-and-diff is the easiest to reason about and the easiest to break with accidental re-renders. Compiled and signal-based updates are faster under load and stricter about how state may be read. The client state and real-time pages in this project are where the difference shows up as numbers.
