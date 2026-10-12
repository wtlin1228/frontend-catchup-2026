<script>
  import Layout from './Layout.svelte';
</script>

<!-- A plain form: Svelte renders it, the browser validates it and posts it. No state, no handlers. -->
<Layout pattern="forms" variant="light">
  {#snippet header()}
    <h1>Newsletter</h1>
    <p>No handlers on this page. The browser validates the email, the form posts to <code>/api/subscribe</code>, and the server answers with a page. The difference from the baseline is that the component has to render the form before it exists.</p>
  {/snippet}
  <form class="form panel" action="/api/subscribe" method="post">
    <div class="field">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" class="input" required autocomplete="email" placeholder="you@company.example" />
      <p class="field__hint">Validation messages come from the browser.</p>
    </div>
    <fieldset class="field" style="border: 0; padding: 0; margin: 0 0 var(--space-4)">
      <legend style="font-weight: 500; font-size: 0.95rem; padding: 0; margin-bottom: 0.35rem">How often</legend>
      <label style="display: flex; gap: 0.5rem; align-items: center"><input type="radio" name="frequency" value="weekly" checked style="accent-color: var(--accent)" /> Weekly digest</label>
      <label style="display: flex; gap: 0.5rem; align-items: center"><input type="radio" name="frequency" value="daily" style="accent-color: var(--accent)" /> Every day</label>
    </fieldset>
    <button class="btn btn--primary" type="submit">Subscribe</button>
  </form>
</Layout>
