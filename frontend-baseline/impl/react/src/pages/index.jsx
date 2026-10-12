import { mount } from '../mount.jsx';
import { Layout } from '../Layout.jsx';

const PORTED = [
  ['Static content', '/static/light.html', null],
  ['Forms', '/forms/light.html', null],
  ['Dynamic data and routing', '/dynamic/light.html', null],
  ['Client state', '/state/light.html', '/state/heavy.html'],
];

mount(
  <Layout pattern="index" variant="">
    <>
      <h1>React port</h1>
      <p>The same pages as the baseline, written in React 19 with Vite 8 and the React Compiler off. Same mock API, same stylesheet, same ids, so the baseline's smoke tests and measurement script run against this build unchanged. Pages not listed here are not ported yet; their links lead nowhere in this build.</p>
    </>
    <ul className="stack">
      {PORTED.map(([name, light, heavy]) => (
        <li key={name}>{name}: <a href={light}>light</a>{heavy && <> and <a href={heavy}>heavy</a></>}</li>
      ))}
    </ul>
    <p className="muted">Build it with <code>pnpm build</code>, then <code>pnpm weight</code> prints shipped bytes per page next to the baseline's.</p>
  </Layout>,
);
