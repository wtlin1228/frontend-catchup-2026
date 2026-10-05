// Minimal DOM morphing: make `from` look like `to` while keeping nodes that already match,
// so focus, typed input, scroll position and running animations survive a server-rendered update.
// idiomorph, morphdom and Turbo do this with more care; Element.moveBefore (where available) keeps even more state.
export function morph(from, to) {
  if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) return from.replaceWith(to.cloneNode(true));
  if (from.nodeType === Node.TEXT_NODE) { if (from.data !== to.data) from.data = to.data; return; }
  if (from.nodeType !== Node.ELEMENT_NODE) return;

  for (const { name, value } of [...to.attributes]) if (from.getAttribute(name) !== value) from.setAttribute(name, value);
  for (const { name } of [...from.attributes]) if (!to.hasAttribute(name)) from.removeAttribute(name);
  // Form controls keep what the person typed: attributes sync, the live value does not.

  const byId = new Map([...from.children].filter((c) => c.id).map((c) => [c.id, c]));
  const move = (node, before) => (from.moveBefore ? from.moveBefore(node, before) : from.insertBefore(node, before));
  let cursor = from.firstChild;
  for (const want of to.childNodes) {
    let match = null;
    if (want.nodeType === Node.ELEMENT_NODE && want.id && byId.has(want.id)) match = byId.get(want.id);
    else if (cursor && cursor.nodeType === want.nodeType && cursor.nodeName === want.nodeName && !(cursor.nodeType === Node.ELEMENT_NODE && cursor.id)) match = cursor;
    if (match) {
      if (match !== cursor) move(match, cursor);
      morph(match, want);
      cursor = match.nextSibling;
    } else {
      from.insertBefore(want.cloneNode(true), cursor);
    }
  }
  while (cursor) { const next = cursor.nextSibling; cursor.remove(); cursor = next; }
}

/** Parse an HTML string into a detached element tree. */
export function parseHTML(text) {
  const doc = new DOMParser().parseFromString(`<body><div id="__root">${text}</div></body>`, 'text/html');
  return doc.getElementById('__root');
}
