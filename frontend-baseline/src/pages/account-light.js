import { getTheme, applyTheme } from '../lib/theme.js';

const form = document.getElementById('theme-form');
form.elements.namedItem('theme').value = getTheme();
form.addEventListener('change', (e) => applyTheme(e.target.value));
