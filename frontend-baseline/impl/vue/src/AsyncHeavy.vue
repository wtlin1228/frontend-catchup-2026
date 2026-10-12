<script setup>
import { ref, reactive } from 'vue';
import Layout from './Layout.vue';
import PostPart from './async-heavy/PostPart.vue';
import RelatedPart from './async-heavy/RelatedPart.vue';
import StatusPart from './async-heavy/StatusPart.vue';
import Composed from './async-heavy/Composed.vue';
import '@baseline/src/pages/common-2.css';

let t0 = performance.now();
const id = ref(3);
const atomic = ref(true);
const stale = ref(false);
const attempts = reactive({ post: 0, related: 0, status: 0 });
const pendingLikes = ref(0);
const log = ref([]);
const add = (text, cls = '') => log.value.unshift({ text: `${((performance.now() - t0) / 1000).toFixed(2)}s ${text}`, cls });
const ready = (name) => add(`${name}: ready`, 'ok');
const lane = (delta) => { pendingLikes.value += delta; };
const load = (next) => { t0 = performance.now(); id.value = next; add(`load post ${next}`); };
const retry = (name) => { add(`retry ${name}`); attempts[name]++; };
const PARTS = { post: PostPart, related: RelatedPart, status: StatusPart };
const TITLES = { post: 'Post', related: 'Related', status: 'Status (flaky)' };
</script>

<template>
  <Layout pattern="async" variant="heavy">
    <template #header>
      <h1>Composed view</h1>
      <p>One screen built from three sources: the post, related posts (which depend on the post) and a status call that fails half the time. Each part is an async component. Atomic mode puts the three inside one <code>&lt;Suspense&gt;</code>: the old view stays, dimmed while the boundary is pending, until every part has resolved, then they commit together, and a newer post replaces a pending one. Stream mode gives each part its own boundary with a zero timeout. The flaky part catches its own failure and retries alone; likes apply in an optimistic lane and roll back when the server refuses.</p>
    </template>
    <div class="cluster" style="margin-bottom: var(--space-4)">
      <label>Post <select id="post" class="select" :value="id" @change="load(Number($event.target.value))"><option v-for="n in 14" :key="n" :value="n">Post {{ n }}</option></select></label>
      <label class="switch"><input type="checkbox" id="atomic" v-model="atomic" @change="load(id)" /> Atomic commit</label>
      <span id="lane" class="muted">{{ pendingLikes ? `${pendingLikes} optimistic update${pendingLikes === 1 ? '' : 's'} pending` : '' }}</span>
    </div>
    <!-- Suspense re-enters its pending state only when the root node of its slot changes, so atomic mode is one keyed
         async component; the wrapper dims whatever the boundary keeps on screen meanwhile. -->
    <div v-if="atomic" :class="{ stale }">
      <Suspense @pending="stale = true" @resolve="stale = false; add('committed in one paint')">
        <template #fallback>
          <div id="view" class="two-col"><section v-for="(title, name) in TITLES" :key="name" class="panel stack"><h2 style="font-size: 1rem; margin: 0">{{ title }}</h2><p class="skeleton" style="height: 3rem">&nbsp;</p></section></div>
        </template>
        <Composed :key="id" :id="id" @ready="ready" @log="add" @lane="lane" />
      </Suspense>
    </div>
    <div v-else id="view" class="two-col">
      <section v-for="(title, name) in TITLES" :key="name" class="panel stack">
        <h2 style="font-size: 1rem; margin: 0">{{ title }}</h2>
        <Suspense :timeout="0">
          <template #fallback><p class="skeleton" style="height: 3rem">&nbsp;</p></template>
          <component :is="PARTS[name]" :key="`${id}-${attempts[name]}`" :id="id" :attempt="attempts[name]" @ready="ready" @log="add" @lane="lane" @retry="retry" />
        </Suspense>
      </section>
    </div>
    <h2 style="margin-top: var(--space-6)">Timeline</h2>
    <ol id="log" class="log-list"><li v-for="(entry, i) in log" :key="log.length - i" :class="entry.cls">{{ entry.text }}</li></ol>
  </Layout>
</template>
