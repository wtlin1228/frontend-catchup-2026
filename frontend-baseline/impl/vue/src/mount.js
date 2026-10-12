import { createApp } from 'vue';

export const boot = (Component) => createApp(Component).mount('#root');
