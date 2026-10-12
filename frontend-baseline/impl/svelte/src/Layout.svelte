<script>
  // The baseline's partials as one component: head.html's stylesheet, header.html's pattern menu,
  // variant-nav.html's switcher and footer.html. The inline theme script stays in each HTML file.
  import '@baseline/src/styles/global.css';
  import { PATTERNS } from './patterns.js';
  let { pattern, variant, header, children } = $props();
  const number = PATTERNS.findIndex(([id]) => id === pattern) + 1;
  const name = PATTERNS[number - 1]?.[1] ?? '';
</script>

<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="container site-header__inner">
    <a class="brand" href="/">
      <svg class="brand__mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="currentColor" /><path d="M8 21h16M8 11h10" stroke="#fff" stroke-width="3" stroke-linecap="round" /></svg>
      Frontend Baseline
    </a>
    <details class="nav-menu">
      <summary class="btn btn--sm">Patterns</summary>
      <nav aria-label="Patterns">
        <ol class="nav-menu__list">
          {#each PATTERNS as [id, label] (id)}
            <li><a href="/{id}/light.html" data-page={id} aria-current={id === pattern ? 'page' : undefined}>{label}</a></li>
          {/each}
        </ol>
      </nav>
    </details>
  </div>
</header>
<main id="main" class="container page">
  <div class="page-header">
    {#if number > 0}
      <p class="pattern">Pattern {number} of {PATTERNS.length}: {name.toLowerCase()}</p>
      <nav class="variant-nav" aria-label="Variant">
        <a href="/{pattern}/light.html" data-variant="light" aria-current={variant === 'light' ? 'page' : undefined}>Light</a>
        <a href="/{pattern}/heavy.html" data-variant="heavy" aria-current={variant === 'heavy' ? 'page' : undefined}>Heavy</a>
      </nav>
    {/if}
    {@render header()}
  </div>
  {@render children()}
</main>
<footer class="site-footer">
  <div class="container site-footer__inner">
    <p>Svelte 5 port of the baseline: same pages, same mock API, same stylesheet. Only the framework differs.</p>
    <p>Each page isolates one pattern. The pattern, why it matters and what frameworks do about it are in <code>README.md</code>.</p>
  </div>
</footer>
