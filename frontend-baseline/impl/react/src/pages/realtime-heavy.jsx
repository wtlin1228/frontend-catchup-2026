import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { mount } from '../mount.jsx';
import { Layout } from '../Layout.jsx';
import '@baseline/src/pages/realtime-heavy.css';

const METRICS = [
  { key: 'cpu', label: 'CPU', unit: '%', max: 100 },
  { key: 'mem', label: 'Memory', unit: '%', max: 100 },
  { key: 'rps', label: 'Requests per second', unit: '', max: 400 },
  { key: 'latency', label: 'p95 latency', unit: ' ms', max: 400 },
];
const POINTS = 120;
const LOG_ROWS = 30;

// The data lives outside React in ring buffers; events only mark them dirty. One requestAnimationFrame
// per burst of events bumps a `frame` counter, which is the single state update React renders from.
// "Patch" is React's normal reconciliation; "rebuild" remounts the subtree every frame (key={frame}), the naive end.
const buffers = { series: Object.fromEntries(METRICS.map((m) => [m.key, []])), logs: [] };

function stats(values) {
  if (!values.length) return { last: 0, min: 0, max: 0, avg: 0 };
  let min = Infinity, max = -Infinity, sum = 0;
  for (const v of values) { if (v < min) min = v; if (v > max) max = v; sum += v; }
  return { last: values[values.length - 1], min, max, avg: sum / values.length };
}
const fmt = (v, unit) => `${Number.isInteger(v) ? v : v.toFixed(1)}${unit}`;
const x = (i, n) => (((POINTS - n + i) / (POINTS - 1)) * 100).toFixed(2);
const y = (v, max) => (29 - (Math.min(v, max) / max) * 28).toFixed(2);
const linePath = (values, max) => (values.length < 2 ? '' : values.map((v, i) => `${i ? 'L' : 'M'}${x(i, values.length)},${y(v, max)}`).join(' '));
const areaPath = (values, max) => (values.length < 2 ? '' : `${linePath(values, max)} L100,30 L${x(0, values.length)},30 Z`);

function MetricCard({ m, values }) {
  const s = stats(values);
  return (
    <article className="metric" aria-label={m.label}>
      <h2 className="metric__label">{m.label}</h2>
      <p className="metric__value">{fmt(s.last, m.unit)}</p>
      <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
        <path className="spark__area" d={areaPath(values, m.max)} />
        <path className="spark__line" d={linePath(values, m.max)} />
      </svg>
      <p className="metric__stats muted">min <span>{fmt(s.min, m.unit)}</span> avg <span>{fmt(s.avg, m.unit)}</span> max <span>{fmt(s.max, m.unit)}</span></p>
    </article>
  );
}

function Dashboard() {
  const [frame, setFrame] = useState(0);
  const [strategy, setStrategy] = useState('patch');
  const [hz, setHz] = useState(10);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState(['connecting', 'Connecting']);
  const metricsRef = useRef(null);
  const renderMs = useRef(null);
  const updates = useRef(null);
  const t0 = useRef(0);
  const counter = useRef({ renders: 0, since: performance.now() });

  useEffect(() => {
    if (paused) { setStatus(['paused', 'Paused']); return; }
    const source = new EventSource(`/api/stream?hz=${hz}`);
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; t0.current = performance.now(); setFrame((f) => f + 1); });
    };
    setStatus(['connecting', 'Connecting']);
    source.onopen = () => setStatus(['live', `Live at ${hz} Hz`]);
    source.onerror = () => setStatus(source.readyState === EventSource.CLOSED ? ['closed', 'Closed'] : ['reconnecting', 'Reconnecting']);
    source.addEventListener('metric', (e) => {
      const m = JSON.parse(e.data);
      for (const { key } of METRICS) { const s = buffers.series[key]; s.push(m[key]); if (s.length > POINTS) s.shift(); }
      schedule();
    });
    source.addEventListener('log', (e) => { buffers.logs.unshift(JSON.parse(e.data)); if (buffers.logs.length > LOG_ROWS) buffers.logs.length = LOG_ROWS; schedule(); });
    return () => source.close();
  }, [hz, paused]);

  // After each committed frame: force layout and write the timing into the DOM, no extra render.
  useLayoutEffect(() => {
    if (!t0.current) return;
    void metricsRef.current.offsetHeight;
    renderMs.current.textContent = (performance.now() - t0.current).toFixed(2);
    const c = counter.current;
    c.renders++;
    if (t0.current - c.since >= 1000) { updates.current.textContent = c.renders; c.renders = 0; c.since = t0.current; }
    t0.current = 0;
  }, [frame]);

  const subtreeKey = strategy === 'rebuild' ? frame : 'static';
  return (
    <>
      <div className="dash-toolbar">
        <p className="dash-status"><span id="conn-dot" className="dot" data-state={status[0]} /> <span id="conn-status">{status[1]}</span></p>
        <button id="pause-stream" className="btn" type="button" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>{paused ? 'Resume' : 'Pause'}</button>
        <label className="dash-rate">Rate
          <select id="rate" className="select" value={hz} onChange={(e) => setHz(Number(e.target.value))}>
            <option value="2">2 Hz</option><option value="10">10 Hz</option><option value="30">30 Hz</option>
          </select>
        </label>
        <fieldset className="dash-strategy">
          <legend>DOM strategy</legend>
          <label><input type="radio" name="strategy" value="patch" checked={strategy === 'patch'} onChange={() => setStrategy('patch')} /> Patch nodes</label>
          <label><input type="radio" name="strategy" value="rebuild" checked={strategy === 'rebuild'} onChange={() => setStrategy('rebuild')} /> Rebuild subtree</label>
        </fieldset>
        <p className="dash-perf muted"><span id="updates" ref={updates}>0</span> renders/s, last render <span id="render-ms" ref={renderMs}>0.0</span> ms</p>
      </div>
      <section id="metrics" ref={metricsRef} className="metrics" aria-label="Live metrics" key={subtreeKey}>
        {METRICS.map((m) => <MetricCard key={m.key} m={m} values={buffers.series[m.key]} />)}
      </section>
      <section className="dash-log">
        <h2>Events</h2>
        <table className="log">
          <thead><tr><th>When</th><th>Level</th><th>Message</th></tr></thead>
          <tbody id="log-body" key={`log-${subtreeKey}`}>
            {buffers.logs.map((e) => (
              <tr key={e.id} className={`log__row log__row--${e.level}`}>
                <td><time dateTime={new Date(e.t).toISOString()}>{new Date(e.t).toLocaleTimeString()}</time></td>
                <td><span className="level">{e.level}</span></td>
                <td>{e.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

mount(
  <Layout pattern="realtime" variant="heavy">
    <>
      <h1>Dashboard</h1>
      <p>Four metrics stream from <code>/api/stream</code> as server-sent events, up to 30 times a second. The data lives in ring buffers outside React; events are coalesced into one state update per frame, so React renders at most once per frame. "Patch nodes" is React's reconciliation; "Rebuild subtree" remounts the metrics and the log every frame through a changing key, the naive end of the spectrum.</p>
    </>
    <Dashboard />
  </Layout>,
);
