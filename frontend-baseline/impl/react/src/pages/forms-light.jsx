import { mount } from '../mount.jsx';
import { Layout } from '../Layout.jsx';

// An uncontrolled form: React renders it, the browser validates it and posts it. No state, no handlers.
const row = { display: 'flex', gap: '0.5rem', alignItems: 'center' };
mount(
  <Layout pattern="forms" variant="light">
    <>
      <h1>Newsletter</h1>
      <p>No handlers on this page. The browser validates the email, the form posts to <code>/api/subscribe</code>, and the server answers with a page. The difference from the baseline is that React has to render the form before it exists.</p>
    </>
    <form className="form panel" action="/api/subscribe" method="post">
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" required autoComplete="email" placeholder="you@company.example" />
        <p className="field__hint">Validation messages come from the browser.</p>
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: '0 0 var(--space-4)' }}>
        <legend style={{ fontWeight: 500, fontSize: '0.95rem', padding: 0, marginBottom: '0.35rem' }}>How often</legend>
        <label style={row}><input type="radio" name="frequency" value="weekly" defaultChecked style={{ accentColor: 'var(--accent)' }} /> Weekly digest</label>
        <label style={row}><input type="radio" name="frequency" value="daily" style={{ accentColor: 'var(--accent)' }} /> Every day</label>
      </fieldset>
      <button className="btn btn--primary" type="submit">Subscribe</button>
    </form>
  </Layout>,
);
