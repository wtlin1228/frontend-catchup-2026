import './forms-heavy.css';
import { debounce } from '../lib/dom.js';
import { postJSON, HttpError } from '../lib/api.js';
import { toast } from '../lib/toast.js';
import { registerTool } from '../lib/agent.js';

const form = document.getElementById('contact-form');
const status = document.getElementById('form-status');
const sendButton = document.getElementById('send');
const draftNote = document.getElementById('draft-note');
const success = document.getElementById('contact-success');
const notes = document.querySelector('.contact-notes');
const count = document.getElementById('message-count');
const control = (name) => form.elements.namedItem(name);
const DRAFT_KEY = 'contact:draft';

// 1. Take over validation. Without this script the browser validates and submits on its own.
form.noValidate = true;
const fields = [...form.elements].filter((el) => el.name && el.name !== 'website' && el.tagName !== 'BUTTON');

// 2. Field validation with the Constraint Validation API and our own wording.
function messageFor(field) {
  const v = field.validity;
  if (v.valid) return '';
  if (v.valueMissing) return field.type === 'checkbox' ? 'Tick the box so we are allowed to reply.' : 'This field is required.';
  if (v.typeMismatch) return 'Enter a valid email address.';
  if (v.tooShort) return `Use at least ${field.minLength} characters.`;
  if (v.tooLong) return `Use at most ${field.maxLength} characters.`;
  return field.validationMessage;
}
function setError(field, text) {
  const out = document.getElementById(`${field.id}-error`);
  field.setAttribute('aria-invalid', text ? 'true' : 'false');
  if (text) field.setAttribute('aria-describedby', out.id);
  else field.removeAttribute('aria-describedby');
  out.textContent = text;
}
function validate(field) {
  field.dataset.touched = 'true';
  const text = messageFor(field);
  setError(field, text);
  return !text;
}
for (const field of fields) {
  field.addEventListener('blur', () => validate(field));
  field.addEventListener('input', () => field.dataset.touched && validate(field)); // live only once touched
}

// 3. Derived display: character count.
control('message').addEventListener('input', () => { count.textContent = control('message').value.length; });

// 4. Draft autosave so a failed submit or a reload does not lose the text.
function saveDraft() {
  const data = Object.fromEntries(new FormData(form));
  delete data.website;
  delete data.attachment; // File objects do not serialise
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  draftNote.textContent = 'Draft saved';
}
function restoreDraft() {
  try {
    const data = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null');
    if (!data) return;
    for (const [name, value] of Object.entries(data)) {
      const el = control(name);
      if (!el) continue;
      if (el.type === 'checkbox') el.checked = value === 'on';
      else el.value = value;
    }
    count.textContent = control('message').value.length;
    draftNote.textContent = 'Draft restored';
  } catch { /* ignore a corrupt draft */ }
}
restoreDraft();
form.addEventListener('input', debounce(saveDraft, 400));

// 5. Submit with fetch to the same URL the plain form posts to.
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const valid = fields.map((f) => validate(f)).every(Boolean); // validate all fields, do not short-circuit
  if (!valid) {
    status.textContent = 'Some fields need attention.';
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  if (upload && upload.readyState !== XMLHttpRequest.DONE) {
    status.textContent = 'Wait for the attachment to finish uploading.';
    return;
  }
  const data = Object.fromEntries(new FormData(form));
  delete data.attachment; // the file was uploaded separately; only its id travels with the form
  data.consent = control('consent').checked;
  setPending(true);
  try {
    const result = await postJSON(form.action, data);
    sessionStorage.removeItem(DRAFT_KEY);
    showSuccess(result.id);
  } catch (err) {
    if (err instanceof HttpError && err.status === 400 && err.body?.errors) {
      // Server-side validation: map errors back onto fields.
      for (const [name, text] of Object.entries(err.body.errors)) {
        const field = control(name);
        if (field) setError(field, text);
      }
      status.textContent = 'The server rejected some fields.';
      form.querySelector('[aria-invalid="true"]')?.focus();
    } else {
      status.textContent = 'Could not send the message. Check your connection and try again; your draft is kept.';
      toast('Sending failed', { type: 'error' });
    }
  } finally {
    setPending(false);
  }
});

function setPending(pending) {
  sendButton.disabled = pending;
  sendButton.textContent = pending ? 'Sending…' : 'Send message';
  form.setAttribute('aria-busy', String(pending));
  if (pending) status.textContent = '';
}
function showSuccess(id) {
  document.getElementById('ticket-id').textContent = id;
  form.hidden = true;
  notes.hidden = true;
  success.hidden = false;
  success.querySelector('button').focus();
  toast('Message sent', { type: 'success' });
}
document.getElementById('send-another').addEventListener('click', () => {
  form.reset();
  for (const field of fields) {
    delete field.dataset.touched;
    setError(field, '');
  }
  count.textContent = '0';
  draftNote.textContent = '';
  status.textContent = '';
  success.hidden = true;
  form.hidden = false;
  notes.hidden = false;
  control('name').focus();
});

// 6. Attachment: uploaded as soon as it is chosen (XMLHttpRequest, because fetch has no upload progress),
//    then referenced by id in the submission. Frameworks hand you FormData/multipart in server actions instead.
const attachment = control('attachment');
const attachmentBox = document.getElementById('attachment-status');
let upload = null;
attachment.addEventListener('change', () => {
  upload?.abort();
  control('attachmentId').value = '';
  setError(attachment, '');
  const file = attachment.files[0];
  if (!file) return void (attachmentBox.hidden = true);
  if (file.size > 5 * 1024 * 1024) {
    setError(attachment, 'Choose a file under 5 MB.');
    attachment.value = '';
    return void (attachmentBox.hidden = true);
  }
  attachmentBox.hidden = false;
  const thumb = document.getElementById('attachment-thumb');
  thumb.hidden = !file.type.startsWith('image/');
  if (!thumb.hidden) thumb.src = URL.createObjectURL(file);
  document.getElementById('attachment-name').textContent = `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
  const progress = document.getElementById('attachment-progress');
  progress.value = 0;
  upload = new XMLHttpRequest();
  upload.open('PUT', '/api/upload');
  upload.setRequestHeader('content-type', file.type || 'application/octet-stream');
  upload.upload.addEventListener('progress', (e) => { if (e.lengthComputable) progress.value = (e.loaded / e.total) * 100; });
  upload.addEventListener('load', () => {
    const body = JSON.parse(upload.responseText || '{}');
    if (upload.status === 201) {
      control('attachmentId').value = body.id;
      progress.value = 100;
    } else {
      setError(attachment, body.error ?? `Upload failed (${upload.status}).`);
    }
  });
  upload.addEventListener('error', () => setError(attachment, 'Upload failed. Check your connection.'));
  upload.send(file);
});
document.getElementById('attachment-cancel').addEventListener('click', () => {
  upload?.abort();
  attachment.value = '';
  control('attachmentId').value = '';
  attachmentBox.hidden = true;
});

// 7. The same capability, offered to browser agents as a structured tool (no-op without WebMCP).
registerTool({
  name: 'send_contact_message',
  description: 'Send a message to the site owners. Returns a ticket id.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      topic: { type: 'string', enum: ['sales', 'support', 'other'] },
      message: { type: 'string', minLength: 10 },
    },
    required: ['name', 'email', 'topic', 'message'],
  },
  execute: async (input) => postJSON(form.action, { ...input, consent: true }),
}).then((ok) => { if (ok) console.info('[agent] contact form registered as a WebMCP tool'); });
