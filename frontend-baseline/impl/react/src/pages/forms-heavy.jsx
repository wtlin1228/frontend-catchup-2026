import { useActionState, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { mount } from '../mount.jsx';
import { Layout } from '../Layout.jsx';
import { postJSON, HttpError } from '@baseline/src/lib/api.js';
import { toast } from '@baseline/src/lib/toast.js';
import { registerTool } from '@baseline/src/lib/agent.js';
import '@baseline/src/pages/forms-heavy.css';

const DRAFT_KEY = 'contact:draft';
const EMPTY = { name: '', email: '', topic: '', message: '', consent: false };
const FIELDS = ['name', 'email', 'topic', 'message', 'attachment', 'consent'];
const loadDraft = () => { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null'); } catch { return null; } };

// The browser's constraint validation, our wording.
function messageFor(field) {
  const v = field.validity;
  if (v.valid) return '';
  if (v.valueMissing) return field.type === 'checkbox' ? 'Tick the box so we are allowed to reply.' : 'This field is required.';
  if (v.typeMismatch) return 'Enter a valid email address.';
  if (v.tooShort) return `Use at least ${field.minLength} characters.`;
  if (v.tooLong) return `Use at most ${field.maxLength} characters.`;
  return field.validationMessage;
}

// useFormStatus reads the enclosing form's action: the button knows it is pending without a prop.
function SendButton() {
  const { pending } = useFormStatus();
  return <button id="send" className="btn btn--primary" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send message'}</button>;
}

function Contact() {
  const draft = useRef(loadDraft());
  const initial = useRef({ ...EMPTY, ...draft.current });
  // Controlled fields on purpose: React resets uncontrolled fields when a form action completes, and a server
  // that rejects one field must not wipe the others.
  const [values, setValues] = useState(initial.current);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const [draftNote, setDraftNote] = useState(draft.current ? 'Draft restored' : '');
  const [attachment, setAttachment] = useState(null);
  const [sent, setSent] = useState(null);
  const form = useRef(null);
  const successButton = useRef(null);
  const touched = useRef(new Set());
  const upload = useRef(null);

  const setError = (name, text) => setErrors((e) => ({ ...e, [name]: text }));
  function validate(field) {
    touched.current.add(field.name);
    const text = messageFor(field);
    setError(field.name, text);
    return !text;
  }
  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setValues((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
    if (touched.current.has(name)) validate(e.target); // live only once touched
  };

  // Draft: saved 400 ms after the last change; the first render and a reset are not changes.
  useEffect(() => {
    if (values === initial.current) return;
    const t = setTimeout(() => { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values)); setDraftNote('Draft saved'); }, 400);
    return () => clearTimeout(t);
  }, [values]);

  // The form action: validate with the browser's API, then post the same JSON the baseline does.
  async function send(_previous, formData) {
    const fields = FIELDS.map((n) => form.current.elements.namedItem(n));
    const results = fields.map((f) => validate(f)); // every field, no short-circuit
    if (!results.every(Boolean)) { setStatus('Some fields need attention.'); fields[results.indexOf(false)].focus(); return null; }
    if (upload.current && upload.current.readyState !== XMLHttpRequest.DONE) { setStatus('Wait for the attachment to finish uploading.'); return null; }
    const data = Object.fromEntries(formData);
    delete data.attachment; // the file was uploaded separately; only its id travels with the form
    data.consent = formData.get('consent') === 'on';
    setStatus('');
    try {
      const result = await postJSON('/api/contact', data);
      sessionStorage.removeItem(DRAFT_KEY);
      setSent(result.id);
      toast('Message sent', { type: 'success' });
    } catch (err) {
      if (err instanceof HttpError && err.status === 400 && err.body?.errors) {
        setErrors((e) => ({ ...e, ...err.body.errors }));
        setStatus('The server rejected some fields.');
        form.current.elements.namedItem(Object.keys(err.body.errors)[0])?.focus();
      } else {
        setStatus('Could not send the message. Check your connection and try again; your draft is kept.');
        toast('Sending failed', { type: 'error' });
      }
    }
    return null;
  }
  const [, submit, pending] = useActionState(send, null);

  // Focus moves with the view: to the success message once sent, back to the first field after a reset. A layout effect,
  // so it happens in the same commit that shows the element.
  const wasSent = useRef(false);
  useLayoutEffect(() => {
    if (sent) successButton.current.focus();
    else if (wasSent.current) form.current.elements.namedItem('name').focus();
    wasSent.current = sent !== null;
  }, [sent]);
  const sendAnother = () => {
    initial.current = { ...EMPTY };
    setValues(initial.current); setErrors({}); setStatus(''); setDraftNote(''); setAttachment(null); setSent(null);
    touched.current.clear(); upload.current = null;
    form.current.elements.namedItem('attachment').value = '';
  };

  // Attachment: uploaded as soon as it is chosen (XMLHttpRequest for the progress events), referenced by id on submit.
  function onFile(e) {
    upload.current?.abort();
    setError('attachment', '');
    const input = e.target;
    const file = input.files[0];
    if (!file) return setAttachment(null);
    if (file.size > 5 * 1024 * 1024) { setError('attachment', 'Choose a file under 5 MB.'); input.value = ''; return setAttachment(null); }
    setAttachment({ name: `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`, thumb: file.type.startsWith('image/') ? URL.createObjectURL(file) : null, progress: 0, id: '' });
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', '/api/upload');
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
    xhr.upload.addEventListener('progress', (ev) => { if (ev.lengthComputable) setAttachment((a) => a && { ...a, progress: (ev.loaded / ev.total) * 100 }); });
    xhr.addEventListener('load', () => {
      const body = JSON.parse(xhr.responseText || '{}');
      if (xhr.status === 201) setAttachment((a) => a && { ...a, progress: 100, id: body.id });
      else setError('attachment', body.error ?? `Upload failed (${xhr.status}).`);
    });
    xhr.addEventListener('error', () => setError('attachment', 'Upload failed. Check your connection.'));
    xhr.send(file);
    upload.current = xhr;
  }
  const cancelUpload = () => { upload.current?.abort(); form.current.elements.namedItem('attachment').value = ''; setAttachment(null); };

  // The same capability, offered to browser agents as a structured tool (no-op without WebMCP).
  useEffect(() => {
    registerTool({
      name: 'send_contact_message',
      description: 'Send a message to the site owners. Returns a ticket id.',
      inputSchema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, topic: { type: 'string', enum: ['sales', 'support', 'other'] }, message: { type: 'string', minLength: 10 } }, required: ['name', 'email', 'topic', 'message'] },
      execute: async (input) => postJSON('/api/contact', { ...input, consent: true }),
    }).then((ok) => { if (ok) console.info('[agent] contact form registered as a WebMCP tool'); });
  }, []);

  const invalid = (name) => (errors[name] === undefined ? undefined : errors[name] ? 'true' : 'false');
  const describedBy = (name) => (errors[name] ? `${name}-error` : undefined);
  const field = (name) => ({ id: name, name, value: values[name], onChange, onBlur: (e) => validate(e.target), 'aria-invalid': invalid(name), 'aria-describedby': describedBy(name) });

  return (
    <>
      <div className="contact-layout">
        <form id="contact-form" ref={form} className="form panel" action={submit} noValidate hidden={sent !== null} aria-busy={pending}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input {...field('name')} className="input" required minLength={2} autoComplete="name" />
            <p className="field__error" id="name-error">{errors.name}</p>
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input {...field('email')} type="email" className="input" required autoComplete="email" />
            <p className="field__hint">Try an address ending in @example.com to see a server-only validation error.</p>
            <p className="field__error" id="email-error">{errors.email}</p>
          </div>
          <div className="field">
            <label htmlFor="topic">Topic</label>
            <select {...field('topic')} className="select" required>
              <option value="">Choose a topic</option><option value="sales">Sales</option><option value="support">Support</option><option value="other">Something else</option>
            </select>
            <p className="field__error" id="topic-error">{errors.topic}</p>
          </div>
          <div className="field">
            <label htmlFor="message">Message</label>
            <textarea {...field('message')} className="textarea" required minLength={10} maxLength={1000} rows={5} />
            <p className="field__hint"><span id="message-count">{values.message.length}</span> / 1000</p>
            <p className="field__error" id="message-error">{errors.message}</p>
          </div>
          <div className="field">
            <label htmlFor="attachment">Attachment (optional, up to 5 MB)</label>
            <input id="attachment" name="attachment" type="file" accept="image/*,.pdf,.txt" onChange={onFile} aria-invalid={invalid('attachment')} aria-describedby={describedBy('attachment')} />
            <input type="hidden" name="attachmentId" id="attachment-id" value={attachment?.id ?? ''} readOnly />
            <div id="attachment-status" className="attachment" hidden={!attachment}>
              <img id="attachment-thumb" alt="" width="48" height="48" hidden={!attachment?.thumb} src={attachment?.thumb ?? undefined} />
              <span id="attachment-name">{attachment?.name}</span>
              <progress id="attachment-progress" max="100" value={attachment?.progress ?? 0}></progress>
              <button id="attachment-cancel" className="btn btn--sm" type="button" onClick={cancelUpload}>Cancel</button>
            </div>
            <p className="field__hint">Uploaded as soon as it is chosen, with progress. The server throttles on purpose.</p>
            <p className="field__error" id="attachment-error">{errors.attachment}</p>
          </div>
          <div className="field field--check">
            <input id="consent" name="consent" type="checkbox" required checked={values.consent} onChange={onChange} onBlur={(e) => validate(e.target)} aria-invalid={invalid('consent')} aria-describedby={describedBy('consent')} />
            <label htmlFor="consent">You may contact me about this request.</label>
            <p className="field__error" id="consent-error">{errors.consent}</p>
          </div>
          <div className="hp" aria-hidden="true">
            <label>Website <input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <div className="cluster">
            <SendButton />
            <span id="draft-note" className="muted">{draftNote}</span>
          </div>
          <p id="form-status" className="form-status" role="status" aria-live="polite">{pending ? '' : status}</p>
        </form>
        <aside className="contact-notes stack" hidden={sent !== null}>
          <div className="notice notice--info">
            <p><strong>What this page exercises</strong></p>
            <ul>
              <li>Constraint Validation API for messages; the form is <code>noValidate</code> because the script is always there.</li>
              <li>Validation on blur, then live after a field was touched.</li>
              <li>A React 19 form action: <code>useActionState</code> for the pending state, <code>useFormStatus</code> in the button.</li>
              <li>Field errors returned by the server (400) rendered next to the inputs.</li>
              <li>Draft kept in <code>sessionStorage</code> until it is sent.</li>
              <li>A honeypot field instead of a captcha.</li>
              <li>A file upload with progress via <code>XMLHttpRequest</code>, cancellable, referenced by id on submit.</li>
            </ul>
          </div>
        </aside>
      </div>
      <div id="contact-success" className="notice notice--success" hidden={sent === null}>
        <p><strong>Message sent.</strong> Your ticket is <code id="ticket-id">{sent}</code>. Expect a reply within two working days.</p>
        <button id="send-another" ref={successButton} className="btn btn--sm" type="button" onClick={sendAnother}>Send another message</button>
      </div>
    </>
  );
}

mount(
  <Layout pattern="forms" variant="heavy">
    <>
      <h1>Contact</h1>
      <p>The baseline's contact form as a React 19 form action: controlled fields, the browser's validation with our wording, a pending state from the action, server errors mapped onto fields, a draft in session storage and an upload with progress. Without the script there is no form at all; that is the price of client rendering, and the light page's reason to exist.</p>
    </>
    <Contact />
  </Layout>,
);
