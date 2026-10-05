// Toast notifications: one shared aria-live region. In frameworks this becomes a context/provider + portal.
let region;

export function toast(message, { type = 'info', duration = 3500 } = {}) {
  if (!region) {
    region = document.createElement('div');
    region.className = 'toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.append(region);
  }
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = message;
  region.append(el);
  const remove = () => {
    clearTimeout(timer);
    el.classList.add('toast--leaving');
    setTimeout(() => el.remove(), 250);
  };
  const timer = setTimeout(remove, duration);
  el.addEventListener('click', remove);
}
