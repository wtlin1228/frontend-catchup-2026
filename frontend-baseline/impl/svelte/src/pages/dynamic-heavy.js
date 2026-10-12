import Page from '../DynamicHeavy.svelte';
import { boot } from '../mount.js';

// A plain GET form (the agent light page) lands here with ?q=; turn it into the hash route the router reads.
const incoming = new URLSearchParams(location.search);
if (!location.hash && incoming.has('q')) history.replaceState(null, '', `${location.pathname}#/?${new URLSearchParams({ q: incoming.get('q') })}`);

boot(Page);
