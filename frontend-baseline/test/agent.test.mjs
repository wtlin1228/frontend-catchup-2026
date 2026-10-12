import { test } from 'node:test';
import assert from 'node:assert/strict';

// agent.js looks for the WebMCP API on document and navigator; neither exists in Node, which is the "absent" case.
globalThis.document ??= {};
const { registerTool, callTool, validate, tools, hasAgentApi } = await import('../src/lib/agent.js');

const schema = { type: 'object', properties: { id: { type: 'integer', minimum: 1 }, q: { type: 'string', minLength: 2 }, theme: { type: 'string', enum: ['light', 'dark'] } }, required: ['id'] };

test('validate: required, type, integer, enum, minLength, minimum, and non-object input', () => {
  assert.deepEqual(validate({ id: 3 }, schema), []);
  assert.deepEqual(validate({}, schema), ['id is required']);
  assert.deepEqual(validate({ id: 'three' }, schema), ['id must be an integer']);
  assert.deepEqual(validate({ id: 1.5 }, schema), ['id must be an integer']);
  assert.deepEqual(validate({ id: 0 }, schema), ['id must be at least 1']);
  assert.deepEqual(validate({ id: 1, q: 'a' }, schema), ['q must be at least 2 characters']);
  assert.deepEqual(validate({ id: 1, q: 7 }, schema), ['q must be a string']);
  assert.deepEqual(validate({ id: 1, theme: 'sepia' }, schema), ['theme must be one of light, dark']);
  assert.deepEqual(validate([], schema), ['arguments must be a JSON object']);
  assert.deepEqual(validate({ anything: 1 }, undefined), [], 'no schema, no errors');
});

test('registerTool without the browser API records the tool locally and resolves false', async () => {
  assert.equal(hasAgentApi(), false);
  const ok = await registerTool({ name: 'echo', description: 'Echo', inputSchema: schema, execute: ({ id }) => ({ id }) });
  assert.equal(ok, false);
  assert.ok(tools.has('echo'));
});

test('callTool: checks the schema before executing, and reports unknown tools', async () => {
  assert.deepEqual(await callTool('echo', { id: 2 }), { id: 2 });
  await assert.rejects(callTool('echo', { id: 'x' }), (err) => err.validation?.[0] === 'id must be an integer');
  await assert.rejects(callTool('missing', {}), /No tool named "missing"/);
});
