import { registerTool, hasAgentApi } from '../lib/agent.js';

const form = document.querySelector('form[role="search"]');

// The tool does what a person does: fill the form and submit it, so the URL stays the single source of truth.
registerTool({
  name: 'search_posts',
  description: 'Search the posts by title or tag and open the results page.',
  inputSchema: { type: 'object', properties: { q: { type: 'string', minLength: 1 } }, required: ['q'] },
  execute: ({ q }) => {
    form.elements.namedItem('q').value = q;
    form.requestSubmit();
    return { navigatedTo: `${form.getAttribute('action')}?q=${encodeURIComponent(q)}` };
  },
}).then((registered) => {
  document.getElementById('webmcp').textContent = hasAgentApi()
    ? (registered ? 'present, search_posts registered' : 'present, but registration failed (see the console)')
    : 'absent, so only the form and the structured data apply';
});
