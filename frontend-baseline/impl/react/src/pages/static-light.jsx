import { mount } from '../mount.jsx';
import { Layout } from '../Layout.jsx';

// The same markup as the baseline's static/light.html. With Vite alone this is a client-rendered page:
// the HTML is an empty div until React runs, which is what the weight report and the no-script check show.
mount(
  <Layout pattern="static" variant="light">
    <>
      <h1>About this project</h1>
      <p>This page is the floor. A heading, a few paragraphs, one responsive image, shared header and footer, and nothing else. It should cost a framework nothing. If it costs 40 KB of JavaScript, that is the first finding.</p>
    </>
    <img src="/images/photo-05-800.png" srcSet="/images/photo-05-400.png 400w, /images/photo-05-800.png 800w, /images/photo-05-1200.png 1200w" sizes="(min-width: 72rem) 48rem, calc(100vw - 2rem)" width="1200" height="900" alt="A generated landscape at dusk: layered hills under a warm sky." style={{ maxWidth: '48rem', borderRadius: 'var(--radius)' }} />
    <h2>What the page contains</h2>
    <ul>
      <li>Semantic HTML with a skip link, landmark regions and a document outline.</li>
      <li>The shared header and footer, rendered by a layout component.</li>
      <li>One image with <code>srcset</code>, <code>sizes</code> and intrinsic dimensions.</li>
      <li>The global stylesheet and a self-hosted font. No page-level CSS; the page's JavaScript is React itself.</li>
    </ul>
    <h2>What to compare</h2>
    <p>Build output for this one page: bytes of HTML, CSS and JavaScript, and whether the framework renders it at build time, on request, or in the browser. Then open it with scripts disabled. Then run Lighthouse on it. The heavy variant is the same pattern at document scale.</p>
  </Layout>,
);
