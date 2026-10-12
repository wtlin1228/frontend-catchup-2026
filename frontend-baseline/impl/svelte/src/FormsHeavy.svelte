<script>
  import { tick } from 'svelte';
  import Layout from './Layout.svelte';
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

  const draft = loadDraft();
  // Bound fields: the values object is the form's state, the DOM follows it, and validation reads the DOM's validity.
  let values = $state({ ...EMPTY, ...draft });
  let errors = $state({});
  let status = $state('');
  let draftNote = $state(draft ? 'Draft restored' : '');
  let pending = $state(false);
  let attachment = $state(null);
  let sent = $state(null);
  let form = $state(null);
  let successButton = $state(null);
  const touched = new Set();
  let upload = null;
  let timer = 0;

  function validate(field) {
    touched.add(field.name);
    const text = messageFor(field);
    errors[field.name] = text;
    return !text;
  }
  const onBlur = (e) => validate(e.target);
  const onInput = (e) => { if (touched.has(e.target.name)) validate(e.target); }; // live only once touched
  // Draft: the form's input event, debounced, as in the baseline; the bound values are what gets saved.
  const saveDraft = () => { clearTimeout(timer); timer = setTimeout(() => { sessionStorage.setItem(DRAFT_KEY, JSON.stringify($state.snapshot(values))); draftNote = 'Draft saved'; }, 400); };

  async function submit(e) {
    e.preventDefault();
    const fields = FIELDS.map((n) => form.elements.namedItem(n));
    const results = fields.map((f) => validate(f)); // every field, no short-circuit
    if (!results.every(Boolean)) { status = 'Some fields need attention.'; fields[results.indexOf(false)].focus(); return; }
    if (upload && upload.readyState !== XMLHttpRequest.DONE) { status = 'Wait for the attachment to finish uploading.'; return; }
    const data = Object.fromEntries(new FormData(form));
    delete data.attachment; // the file was uploaded separately; only its id travels with the form
    data.consent = values.consent;
    pending = true;
    status = '';
    try {
      const result = await postJSON(form.action, data);
      sessionStorage.removeItem(DRAFT_KEY);
      sent = result.id;
      toast('Message sent', { type: 'success' });
      await tick();
      successButton.focus();
    } catch (err) {
      if (err instanceof HttpError && err.status === 400 && err.body?.errors) {
        Object.assign(errors, err.body.errors);
        status = 'The server rejected some fields.';
        form.elements.namedItem(Object.keys(err.body.errors)[0])?.focus();
      } else {
        status = 'Could not send the message. Check your connection and try again; your draft is kept.';
        toast('Sending failed', { type: 'error' });
      }
    } finally { pending = false; }
  }
  async function sendAnother() {
    values = { ...EMPTY }; errors = {}; touched.clear();
    status = ''; draftNote = ''; attachment = null; upload = null; sent = null;
    form.elements.namedItem('attachment').value = '';
    await tick();
    form.elements.namedItem('name').focus();
  }

  // Attachment: uploaded as soon as it is chosen (XMLHttpRequest for the progress events), referenced by id on submit.
  function onFile(e) {
    upload?.abort();
    errors.attachment = '';
    const input = e.target;
    const file = input.files[0];
    if (!file) return void (attachment = null);
    if (file.size > 5 * 1024 * 1024) { errors.attachment = 'Choose a file under 5 MB.'; input.value = ''; return void (attachment = null); }
    attachment = { name: `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`, thumb: file.type.startsWith('image/') ? URL.createObjectURL(file) : null, progress: 0, id: '' };
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', '/api/upload');
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
    xhr.upload.addEventListener('progress', (ev) => { if (ev.lengthComputable && attachment) attachment.progress = (ev.loaded / ev.total) * 100; });
    xhr.addEventListener('load', () => {
      const body = JSON.parse(xhr.responseText || '{}');
      if (xhr.status === 201) { if (attachment) { attachment.progress = 100; attachment.id = body.id; } }
      else errors.attachment = body.error ?? `Upload failed (${xhr.status}).`;
    });
    xhr.addEventListener('error', () => { errors.attachment = 'Upload failed. Check your connection.'; });
    xhr.send(file);
    upload = xhr;
  }
  const cancelUpload = () => { upload?.abort(); form.elements.namedItem('attachment').value = ''; attachment = null; };

  // The same capability, offered to browser agents as a structured tool (no-op without WebMCP).
  registerTool({
    name: 'send_contact_message',
    description: 'Send a message to the site owners. Returns a ticket id.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, topic: { type: 'string', enum: ['sales', 'support', 'other'] }, message: { type: 'string', minLength: 10 } }, required: ['name', 'email', 'topic', 'message'] },
    execute: async (input) => postJSON('/api/contact', { ...input, consent: true }),
  }).then((ok) => { if (ok) console.info('[agent] contact form registered as a WebMCP tool'); });

  const invalid = (name) => (errors[name] === undefined ? undefined : errors[name] ? 'true' : 'false');
  const describedBy = (name) => (errors[name] ? `${name}-error` : undefined);
</script>

<Layout pattern="forms" variant="heavy">
  {#snippet header()}
    <h1>Contact</h1>
    <p>The baseline's contact form with bound fields: one state object is the form, the browser validates with our wording, a pending flag disables the button, server errors land on fields, the draft lives in session storage and the upload reports progress. Without the script there is no form at all; that is the price of client rendering, and the light page's reason to exist.</p>
  {/snippet}
  <div class="contact-layout">
    <form id="contact-form" bind:this={form} class="form panel" action="/api/contact" method="post" novalidate hidden={sent !== null} aria-busy={pending} onsubmit={submit} oninput={saveDraft}>
      <div class="field">
        <label for="name">Name</label>
        <input id="name" name="name" class="input" required minlength="2" autocomplete="name" bind:value={values.name} oninput={onInput} onblur={onBlur} aria-invalid={invalid('name')} aria-describedby={describedBy('name')} />
        <p class="field__error" id="name-error">{errors.name ?? ''}</p>
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" class="input" required autocomplete="email" bind:value={values.email} oninput={onInput} onblur={onBlur} aria-invalid={invalid('email')} aria-describedby={describedBy('email')} />
        <p class="field__hint">Try an address ending in @example.com to see a server-only validation error.</p>
        <p class="field__error" id="email-error">{errors.email ?? ''}</p>
      </div>
      <div class="field">
        <label for="topic">Topic</label>
        <select id="topic" name="topic" class="select" required bind:value={values.topic} oninput={onInput} onblur={onBlur} aria-invalid={invalid('topic')} aria-describedby={describedBy('topic')}>
          <option value="">Choose a topic</option><option value="sales">Sales</option><option value="support">Support</option><option value="other">Something else</option>
        </select>
        <p class="field__error" id="topic-error">{errors.topic ?? ''}</p>
      </div>
      <div class="field">
        <label for="message">Message</label>
        <textarea id="message" name="message" class="textarea" required minlength="10" maxlength="1000" rows="5" bind:value={values.message} oninput={onInput} onblur={onBlur} aria-invalid={invalid('message')} aria-describedby={describedBy('message')}></textarea>
        <p class="field__hint"><span id="message-count">{values.message.length}</span> / 1000</p>
        <p class="field__error" id="message-error">{errors.message ?? ''}</p>
      </div>
      <div class="field">
        <label for="attachment">Attachment (optional, up to 5 MB)</label>
        <input id="attachment" name="attachment" type="file" accept="image/*,.pdf,.txt" onchange={onFile} aria-invalid={invalid('attachment')} aria-describedby={describedBy('attachment')} />
        <input type="hidden" name="attachmentId" id="attachment-id" value={attachment?.id ?? ''} />
        <div id="attachment-status" class="attachment" hidden={!attachment}>
          <img id="attachment-thumb" alt="" width="48" height="48" hidden={!attachment?.thumb} src={attachment?.thumb ?? undefined} />
          <span id="attachment-name">{attachment?.name ?? ''}</span>
          <progress id="attachment-progress" max="100" value={attachment?.progress ?? 0}></progress>
          <button id="attachment-cancel" class="btn btn--sm" type="button" onclick={cancelUpload}>Cancel</button>
        </div>
        <p class="field__hint">Uploaded as soon as it is chosen, with progress. The server throttles on purpose.</p>
        <p class="field__error" id="attachment-error">{errors.attachment ?? ''}</p>
      </div>
      <div class="field field--check">
        <input id="consent" name="consent" type="checkbox" required bind:checked={values.consent} oninput={onInput} onblur={onBlur} aria-invalid={invalid('consent')} aria-describedby={describedBy('consent')} />
        <label for="consent">You may contact me about this request.</label>
        <p class="field__error" id="consent-error">{errors.consent ?? ''}</p>
      </div>
      <div class="hp" aria-hidden="true">
        <label>Website <input type="text" name="website" tabindex="-1" autocomplete="off" /></label>
      </div>
      <div class="cluster">
        <button id="send" class="btn btn--primary" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send message'}</button>
        <span id="draft-note" class="muted">{draftNote}</span>
      </div>
      <p id="form-status" class="form-status" role="status" aria-live="polite">{status}</p>
    </form>
    <aside class="contact-notes stack" hidden={sent !== null}>
      <div class="notice notice--info">
        <p><strong>What this page exercises</strong></p>
        <ul>
          <li>Constraint Validation API for messages; the form is <code>novalidate</code> because the script is always there.</li>
          <li>Validation on blur, then live after a field was touched.</li>
          <li>Submission via <code>fetch</code> to the form's own <code>action</code>; a pending flag drives the button.</li>
          <li>Field errors returned by the server (400) rendered next to the inputs.</li>
          <li>Draft kept in <code>sessionStorage</code> until it is sent.</li>
          <li>A honeypot field instead of a captcha.</li>
          <li>A file upload with progress via <code>XMLHttpRequest</code>, cancellable, referenced by id on submit.</li>
        </ul>
      </div>
    </aside>
  </div>
  <div id="contact-success" class="notice notice--success" hidden={sent === null}>
    <p><strong>Message sent.</strong> Your ticket is <code id="ticket-id">{sent ?? ''}</code>. Expect a reply within two working days.</p>
    <button id="send-another" bind:this={successButton} class="btn btn--sm" type="button" onclick={sendAnother}>Send another message</button>
  </div>
</Layout>
