const $ = (id) => document.getElementById(id);
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // keep the browser's own banner quiet; show our button instead
  deferredPrompt = e;
  $('install').hidden = false;
  $('install-status').textContent = '';
});
$('install').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  $('install-status').textContent = outcome === 'accepted' ? 'Installing.' : 'Install dismissed.';
  deferredPrompt = null;
  $('install').hidden = true;
});
window.addEventListener('appinstalled', () => { $('install-status').textContent = 'Installed.'; });
if (matchMedia('(display-mode: standalone)').matches) $('mode').textContent = 'Running as an installed app.';

const paintConnection = () => { $('conn').textContent = navigator.onLine ? 'online' : 'offline'; };
window.addEventListener('online', paintConnection);
window.addEventListener('offline', paintConnection);
paintConnection();
