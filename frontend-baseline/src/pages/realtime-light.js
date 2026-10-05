const $ = (id) => document.getElementById(id);
let timer;

async function poll() {
  try {
    const res = await fetch('/api/status', { cache: 'no-store' });
    const data = await res.json();
    $('online').textContent = data.online;
    $('load').textContent = data.load.toFixed(2);
    $('time').textContent = new Date(data.time).toLocaleTimeString();
    $('time').dateTime = data.time;
    $('updated').textContent = 'just now';
  } catch {
    $('updated').textContent = 'failed, retrying';
  }
}
function start() {
  clearInterval(timer);
  poll();
  timer = setInterval(poll, 2000);
}
document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : start()));
start();
