import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import Page from '../DynamicHeavy.vue';
import ListView from '../dynamic-heavy/ListView.vue';
import DetailView from '../dynamic-heavy/DetailView.vue';
import NewPostView from '../dynamic-heavy/NewPostView.vue';
import NotFound from '../dynamic-heavy/NotFound.vue';

// A plain GET form (the agent light page) lands here with ?q=; turn it into the hash route the router reads.
const incoming = new URLSearchParams(location.search);
if (!location.hash && incoming.has('q')) history.replaceState(null, '', `${location.pathname}#/?${new URLSearchParams({ q: incoming.get('q') })}`);

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: ListView },
    { path: '/posts/:id', component: DetailView },
    { path: '/new', component: NewPostView },
    { path: '/:rest(.*)*', component: NotFound },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } });
createApp(Page).use(router).use(VueQueryPlugin, { queryClient }).mount('#root');
