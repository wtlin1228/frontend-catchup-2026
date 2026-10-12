// Shared pieces of the browser scripts: the Chrome launch, the page list and the "run as a script" guard.
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';

export const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';

export const PATTERNS = ['static', 'forms', 'dynamic', 'state', 'scene', 'realtime', 'media', 'account', 'content', 'table', 'components', 'motion', 'offline', 'async', 'keepalive', 'rpc', 'sync', 'morph', 'navigation', 'errors', 'observe', 'security', 'styling', 'agent'];

/** Every page the baseline builds, as site paths. A port that keeps the URLs is checked against the same list. */
export const ALL_PAGES = ['/', ...PATTERNS.flatMap((p) => [`/${p}/light.html`, `/${p}/heavy.html`]), '/offline/fallback.html', '/navigation/app', '/navigation/app/about', '/content/articles/measuring-a-framework.html'];

export async function launch() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--enable-features=NavigationAPI'] });
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  return { browser, context };
}

/** True when `moduleUrl` is the script Node was started with (so a module can be both importable and runnable). */
export const isMain = (moduleUrl) => Boolean(process.argv[1]) && moduleUrl === pathToFileURL(process.argv[1]).href;

/** Headless Chrome reports an aborted cross-document view transition on random ordinary navigations; it is not tied to any page. */
export const isHeadlessNoise = (text) => /ViewTransition opt-in disabled/.test(text);

/** Expected console noise: deliberately failing endpoints, GPU warnings, and resource lines whose status is tracked separately. */
export const isExpectedConsole = (text) => /GPU stall|api\/flaky|Failed to load resource|TrustedHTML/.test(text);

/** Wait until a URL answers, for scripts that start their own preview server. */
export async function waitFor(url, { tries = 40, ms = 500 } = {}) {
  for (let i = 0; i < tries; i++) {
    try { const res = await fetch(url); if (res.ok) return true; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, ms));
  }
  return false;
}
