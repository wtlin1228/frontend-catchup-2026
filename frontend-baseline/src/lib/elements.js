// A custom element: the platform's own component model. Note the lifecycle hooks
// (connected/disconnected/attributeChanged): every framework has equivalents, and the
// cleanup in disconnectedCallback is what effect cleanups/onDestroy exist for.

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const UNITS = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];

export function relativeTime(date, now = Date.now()) {
  const seconds = (date - now) / 1000;
  for (const [unit, size] of UNITS) if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  return rtf.format(Math.round(seconds), 'second');
}

class RelativeTime extends HTMLElement {
  static observedAttributes = ['datetime'];
  #timer;
  connectedCallback() {
    this.#render();
    this.#timer = setInterval(() => this.#render(), 30_000);
  }
  disconnectedCallback() {
    clearInterval(this.#timer);
  }
  attributeChangedCallback() {
    if (this.isConnected) this.#render();
  }
  #render() {
    const date = new Date(this.getAttribute('datetime'));
    if (Number.isNaN(date.getTime())) return;
    this.textContent = relativeTime(date);
    this.title = date.toLocaleString();
  }
}

if (!customElements.get('relative-time')) customElements.define('relative-time', RelativeTime);
