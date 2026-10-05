// Agent-ready UI: expose a page capability as a tool for in-browser AI agents (WebMCP, W3C draft).
// Feature-detected: does nothing where the API is absent. The API moved from navigator to document in 2026.
export async function registerTool(tool) {
  const context = document.modelContext ?? navigator.modelContext;
  if (!context?.registerTool) return false;
  try {
    await context.registerTool(tool);
    return true;
  } catch (err) {
    console.warn('[agent] registerTool failed', err);
    return false;
  }
}
