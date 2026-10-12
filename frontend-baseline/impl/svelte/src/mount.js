import { mount } from 'svelte';

export const boot = (Component, props = {}) => mount(Component, { target: document.getElementById('root'), props });
