// Agent-ready UI: expose page capabilities as tools for in-browser AI agents (WebMCP, W3C draft).
// Feature-detected: registration is a no-op where the API is absent (it moved from navigator to document in 2026).
// A local registry keeps every tool the page registered, so the page itself (the agent console on the heavy
// agent page) can list and call them the way an agent would: by name, with schema-checked JSON arguments.
const registry = new Map();

/** Every tool this page registered, by name: { name, description, inputSchema, execute }. */
export const tools = registry;

const context = () => document.modelContext ?? navigator.modelContext;
export const hasAgentApi = () => Boolean(context()?.registerTool);

/** Record the tool locally and hand it to the browser's agent API when there is one. Resolves true when the browser took it. */
export async function registerTool(tool) {
  registry.set(tool.name, tool);
  const api = context();
  if (!api?.registerTool) return false;
  try {
    await api.registerTool(tool);
    return true;
  } catch (err) {
    console.warn('[agent] registerTool failed', err);
    return false;
  }
}

/** Check `input` against the subset of JSON Schema the tools use: required keys, type, enum, minLength, minimum. */
export function validate(input, schema) {
  const errors = [];
  if (!schema || schema.type !== 'object') return errors;
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return ['arguments must be a JSON object'];
  for (const key of schema.required ?? []) if (!(key in input)) errors.push(`${key} is required`);
  for (const [key, rule] of Object.entries(schema.properties ?? {})) {
    if (!(key in input)) continue;
    const value = input[key];
    const type = rule.type === 'integer' && Number.isInteger(value) ? 'integer' : typeof value;
    if (rule.type && type !== rule.type) errors.push(`${key} must be ${rule.type === 'integer' ? 'an integer' : `a ${rule.type}`}`);
    if (rule.enum && !rule.enum.includes(value)) errors.push(`${key} must be one of ${rule.enum.join(', ')}`);
    if (rule.minLength != null && typeof value === 'string' && value.length < rule.minLength) errors.push(`${key} must be at least ${rule.minLength} characters`);
    if (rule.minimum != null && typeof value === 'number' && value < rule.minimum) errors.push(`${key} must be at least ${rule.minimum}`);
  }
  return errors;
}

/** Call a registered tool the way an agent would. Throws with `.validation` when the arguments fail the schema. */
export async function callTool(name, input = {}) {
  const tool = registry.get(name);
  if (!tool) throw new Error(`No tool named "${name}"`);
  const errors = validate(input, tool.inputSchema);
  if (errors.length) throw Object.assign(new Error(errors.join('; ')), { validation: errors });
  return tool.execute(input);
}
