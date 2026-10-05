// The rendering layer. Every framework replaces this file with templates/JSX plus a scheduler.

/** Build an element: h('a', { href, class: 'x', onclick }, 'text', childNode) */
export function h(tag, props = null, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key in el && typeof value !== 'string') el[key] = value;
      else el.setAttribute(key, value === true ? '' : value);
    }
  }
  el.append(...toNodes(children));
  return el;
}

export const toNodes = (children) =>
  children.flat(Infinity).filter((c) => c != null && c !== false && c !== true).map((c) => (c instanceof Node ? c : document.createTextNode(String(c))));

/** Replace a container's children. */
export function mount(root, ...children) {
  root.replaceChildren(...toNodes(children));
  return root;
}

/** addEventListener that returns its own cleanup. */
export function on(target, type, handler, options) {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}

export function debounce(fn, ms = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export const formatDate = (iso, options = { dateStyle: 'medium' }) => new Intl.DateTimeFormat(undefined, options).format(new Date(iso));

/** Same as h(), for SVG elements. */
export function svg(tag, props = null, ...children) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (props) for (const [key, value] of Object.entries(props)) if (value != null && value !== false) el.setAttribute(key, value);
  el.append(...toNodes(children));
  return el;
}
