// Holds its own copy of the rows; answers sort/filter queries with a transferable index array.
import { generateRows, sortFilter } from '../lib/rows.js';

let rows = [];
self.onmessage = ({ data: msg }) => {
  if (msg.type === 'generate') {
    rows = generateRows(msg.count);
    self.postMessage({ type: 'data', rows });
  } else if (msg.type === 'query') {
    const t0 = performance.now();
    const order = sortFilter(rows, msg);
    self.postMessage({ type: 'order', id: msg.id, order, ms: performance.now() - t0 }, [order.buffer]);
  }
};
