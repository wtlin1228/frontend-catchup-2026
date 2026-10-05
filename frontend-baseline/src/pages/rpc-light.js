import { rpc } from '../lib/rpc.js';

const out = document.getElementById('out');
document.getElementById('call').addEventListener('click', async () => {
  out.textContent = 'Calling serverTime()…';
  try {
    const { time } = await rpc('serverTime');
    out.textContent = `The server says ${new Date(time).toLocaleTimeString()}.`;
  } catch (err) {
    out.textContent = `Failed: ${err.message}`;
  }
});
