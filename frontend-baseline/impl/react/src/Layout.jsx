// The baseline's partials as components: head.html's stylesheet import, header.html's pattern menu,
// variant-nav.html's switcher and footer.html. The inline theme script stays inline in each HTML file,
// because anything that runs after React mounts is too late to prevent a flash of the wrong theme.
import '@baseline/src/styles/global.css';

export const PATTERNS = [
  ['static', 'Static content'], ['forms', 'Forms'], ['dynamic', 'Dynamic data and routing'], ['state', 'Client state'],
  ['scene', '3D and imperative libraries'], ['realtime', 'Real-time updates'], ['media', 'Media and lazy loading'],
  ['account', 'Cross-cutting concerns'], ['content', 'Content pipeline'], ['table', 'Data grid'], ['components', 'Composite widgets'],
  ['motion', 'Motion'], ['offline', 'Offline and installable'], ['async', 'Async consistency'], ['keepalive', 'State across navigation'],
  ['rpc', 'Server functions'], ['sync', 'Sync and local-first'], ['morph', 'Morphing and streaming HTML'], ['navigation', 'Platform navigation'],
  ['errors', 'Error boundaries'], ['observe', 'Observability'], ['security', 'Security hardening'], ['styling', 'Styling strategy'], ['agent', 'Agent-ready UI'],
];

export function Layout({ pattern, variant, children }) {
  const number = PATTERNS.findIndex(([id]) => id === pattern) + 1;
  const name = PATTERNS[number - 1]?.[1] ?? '';
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="container site-header__inner">
          <a className="brand" href="/">
            <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="currentColor" /><path d="M8 21h16M8 11h10" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg>
            Frontend Baseline
          </a>
          <details className="nav-menu">
            <summary className="btn btn--sm">Patterns</summary>
            <nav aria-label="Patterns">
              <ol className="nav-menu__list">
                {PATTERNS.map(([id, label]) => (
                  <li key={id}><a href={`/${id}/light.html`} data-page={id} aria-current={id === pattern ? 'page' : undefined}>{label}</a></li>
                ))}
              </ol>
            </nav>
          </details>
        </div>
      </header>
      <main id="main" className="container page">
        <div className="page-header">
          {number > 0 && (
            <>
              <p className="pattern">Pattern {number} of {PATTERNS.length}: {name.toLowerCase()}</p>
              <nav className="variant-nav" aria-label="Variant">
                <a href={`/${pattern}/light.html`} data-variant="light" aria-current={variant === 'light' ? 'page' : undefined}>Light</a>
                <a href={`/${pattern}/heavy.html`} data-variant="heavy" aria-current={variant === 'heavy' ? 'page' : undefined}>Heavy</a>
              </nav>
            </>
          )}
          {children[0]}
        </div>
        {children.slice(1)}
      </main>
      <footer className="site-footer">
        <div className="container site-footer__inner">
          <p>React 19 port of the baseline: same pages, same mock API, same stylesheet. Only the framework differs.</p>
          <p>Each page isolates one pattern. The pattern, why it matters and what frameworks do about it are in <code>README.md</code>.</p>
        </div>
      </footer>
    </>
  );
}
