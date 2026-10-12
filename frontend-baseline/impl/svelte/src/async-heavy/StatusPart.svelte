<script>
  let { id, attempt, current, ready } = $props();
  const status = $derived(await current((async () => {
    void id; void attempt; // a new post or a retry is a new request
    const res = await fetch('/api/flaky');
    if (!res.ok) throw new Error(`status answered ${res.status}`);
    return res.json();
  })()));
  $effect(() => { void status; ready('status'); });
</script>

<p>Server value {status.value}</p>
