# Verifying a port

How to tell whether a framework port of a pattern is an improvement on the baseline, with tools where a tool exists and by hand where it does not. Run everything against the baseline first, on the same machine, the same day, and write the baseline's numbers next to the port's in the framework's sheet. "Better" always means one of three things: fewer bytes, files or concepts for the same behaviour (the light pages); the same behaviour holding up under load, failure and keyboard use (the heavy pages); or a decision the framework made for you that you would have made anyway.

## Tools, in the order to run them

| Tool | What it answers | Command |
|---|---|---|
| Dist checker | Does every built page have a title, one `h1`, `main`, `lang`, working links, assets, anchors, manifest and sitemap? | `pnpm check` for the baseline; `node scripts/check-dist.mjs <port>/dist` for a port. A port that does not generate the baseline's manifest, sitemap, feed or service worker gets lines about those files: write them down under patterns 9 and 13, they are findings, not failures. |
| Page weight | What does each page ship, gzip, HTML + CSS + JS, and which chunks load lazily? | `pnpm weight`; `node scripts/page-weight.mjs <port>/dist`. Counts what the HTML references (`<link rel="stylesheet">`, `<script type="module">`, `modulepreload`); fonts and images are not counted; lazy chunks (`import()`, workers) are listed apart. |
| Browser smoke tests | Does every page load without errors, and do the 17 interactive flows still pass? | `cd tools/smoke && pnpm install`, then `node pages.mjs <url>` and `node flows.mjs <url>` against `pnpm dev` or `pnpm preview`. They find elements by the ids in the baseline's HTML; a port that keeps the URLs and ids runs them unchanged, otherwise edit the selectors at the top of each flow. |
| Lighthouse | Performance and accessibility under mobile throttling. | `pnpm dlx lighthouse <url> --only-categories=performance,accessibility,best-practices --chrome-flags="--headless=new" --output=json --output-path=lh.json`, three runs, take the median. Use the preview server so the mock API answers. |
| The pages themselves | Render time, renders per second, sort time, requests per call, vitals, trace spans, counters. | Printed on the state, real-time, grid, server-function, observability, keep-alive, morph and error pages. Read them after the action named below. |
| DevTools | Requests and their cancellation (Network), long tasks and the first-paint filmstrip (Performance), layout shift regions and reduced motion (Rendering), service worker, caches, cookies and storage (Application), roles and names (Accessibility tree), CSP violations (Console). | Per pattern below. |
| Project numbers | Install size, dependency count, lifecycle scripts, build time. | `pnpm ls --depth=0`, `du -sh node_modules`, `npm query ":attr(scripts, [postinstall])"`, `time pnpm build` twice. |

### The baseline's weights on 2026-10-05

`pnpm weight`, gzip kilobytes, total of HTML, CSS and JS per page. The shared stylesheet with tokens and base styles is 4.5 kB of every number; the self-hosted font and the images are extra. A port's light pages should land near the left column; its heavy pages are allowed to cost more than the right column only if they do more.

| # | Pattern | Light | Heavy | Loaded on demand |
|---|---|---|---|---|
| 1 | Static content | 6.6 | 10.0 | |
| 2 | Forms | 6.6 | 11.9 | |
| 3 | Dynamic data and routing | 7.8 | 13.1 | |
| 4 | Client state | 8.5 | 11.6 | |
| 5 | 3D and imperative libraries | 188.2 | 10.4 | three.js 181.0 and OrbitControls 4.3 on the heavy page only |
| 6 | Real-time updates | 7.1 | 10.3 | |
| 7 | Media and lazy loading | 6.6 | 9.9 | images |
| 8 | Cross-cutting concerns | 7.1 | 11.7 | |
| 9 | Content pipeline | 7.3 | 8.8 | articles 7.5 to 7.8, no JS |
| 10 | Data grid | 9.5 | 11.2 | worker 0.9 |
| 11 | Composite widgets | 7.5 | 10.9 | |
| 12 | Motion | 7.4 | 9.4 | |
| 13 | Offline and installable | 7.3 | 8.8 | fallback page 6.1 |
| 14 | Async consistency | 8.7 | 10.3 | |
| 15 | State across navigation | 9.5 | 10.2 | |
| 16 | Server functions | 7.6 | 9.9 | |
| 17 | Sync and local-first | 9.7 | 10.7 | |
| 18 | Morphing and streaming HTML | 8.3 | 9.5 | |
| 19 | Platform navigation | 6.5 | 10.0 | |
| 20 | Error boundaries | 9.0 | 9.2 | |
| 21 | Observability | 9.0 | 9.6 | |
| 22 | Security hardening | 9.0 | 9.8 | |
| 23 | Styling strategy | 7.1 | 8.0 | |
| | Hub | 9.6 | | |

Ten light pages ship no JavaScript at all (static, forms, media, content, components, motion, navigation, styling, both static pages and all articles). A framework that cannot produce a zero-JS page for them has its first finding.

## Per pattern

Each entry: what better looks like, how a tool shows it, how to see it by hand. Where the baseline prints a number, record the baseline's first.

### 1. Static content
- **Better:** fewer bytes than 6.6 and 10.0 kB, zero JS, the content is in the HTML (not rendered in the browser), same Lighthouse scores.
- **Tool:** `pnpm weight`; `curl -s <url> | grep -c '<h2'` proves the sections are in the response; Lighthouse three times; the dist checker for structure and TOC anchors.
- **Hand:** DevTools, Settings, Debugger, "Disable JavaScript", reload: the page is complete. Print preview of the heavy page: header, footer and TOC gone, link targets printed after links. Device toolbar at 640 px or narrower: the `<picture>` swaps to the other image. TOC links jump and the heading lands below the sticky header.

### 2. Forms
- **Better:** the same behaviour with less code, and no behaviour lost: works with scripts off, inline messages, server errors on fields, drafts, upload progress with cancel.
- **Tool:** flows "forms heavy: submit valid form via fetch", "forms heavy: server-only error maps to field", "forms light: no-JS post returns server page". Accessibility tree: an invalid field has `aria-invalid` and `aria-describedby` pointing at its message.
- **Hand:** scripts off: submit both forms empty and filled, the server page comes back with the errors or the ticket. Scripts on: leave a required field, a message appears on blur and updates while typing; type, reload, "Draft restored"; attach a 1 to 5 MB file, the progress bar advances (the server throttles) and Cancel stops it; press Send while uploading, you are told to wait; an address at `example.com` gets a server-side error on the email field; fill the hidden "website" input from the console and submit: success with ticket `SPAM` (the honeypot).

### 3. Dynamic data and routing
- **Better:** fewer requests for the same screens (cache hits, prefetch), no stale paint, the URL round-trips state, focus moves to the new heading, the route is announced.
- **Tool:** flows "dynamic heavy: list, search, detail, back", "guarded route redirects to login", "publish a post when signed in, then like it". Network panel: open a post, go back, open it again within 30 seconds: one request; hover a title: the detail request fires before the click; click two posts quickly: the first shows "(canceled)".
- **Hand:** type in the search: the hash gets `?q=` and the input keeps focus; Next, then reload: same page; open a post: the tab title changes and the announcer text reads "Navigated to …" (watch `#route-announcer` in Elements); Back restores the list with its query; Like several times: about one in three rolls back with a toast and the count returns; signed out, open `#/new`: you land on the account page with `?next=`, and after signing in you are back on `#/new`; publish with a two-character title: the server's message appears under the field.

### 4. Client state
- **Better:** lower "last render" after "Add 300 cards" than the baseline's naive rebuild, no lost focus or input while rendering, undo and redo, persistence, cross-tab sync.
- **Tool:** flow "state heavy: add card, undo, stress"; Performance panel recording of the stress click (scripting plus rendering time); the page's own "last render N ms".
- **Hand:** Add 300 cards and read the number; type in the filter with 306 cards: each keystroke re-renders, the input keeps focus; drag a card to another column and between two cards; with a card focused press `]` and `[`: it moves and stays focused; Ctrl+Z and Ctrl+Shift+Z; open the page in a second tab and add a card: the first tab shows a toast and the card; reload: everything is still there; Reset asks first.

### 5. 3D and imperative libraries
- **Better:** three.js is not on the light page's critical path if the framework can help it, the heavy page loads it lazily (`pnpm weight` lists it under "loaded on demand"), the scene is built once and mutated, rendering stops off screen, everything is disposed on leave, and no double initialisation (React StrictMode).
- **Tool:** `pnpm weight` (baseline: 181 kB lazy on heavy, on the critical path on light); Network panel: the three.js chunk requested after the heavy page's own script; Performance monitor: CPU near zero with the canvas scrolled out of view or the tab hidden; Memory panel: heap flat after ten navigations away and back.
- **Hand:** scroll the canvas off screen: the fps counter stops; switch tab and back: it resumes; change shape, colour, speed, instance count: the camera orbit you set is kept (mutation, not rebuild); hover the shape, the cursor changes, click selects; Save PNG downloads a picture, not a black square; Console after leaving and returning repeatedly: no "too many WebGL contexts" warning.

### 6. Real-time updates
- **Better:** more renders per second and lower render time at 30 Hz, one DOM update per frame however many events arrive, flat memory, pause and reconnect that work, subscription closed on leave.
- **Tool:** the page's "renders/s" and "last render ms" at 30 Hz for both strategies, recorded for ten seconds; Network panel, EventStream tab, shows the events; Performance monitor: JS heap flat over a minute.
- **Hand:** set 30 Hz and compare "Patch nodes" with "Rebuild subtree"; Pause: the dot goes grey and events stop; Resume: "Live"; stop the dev server: "Reconnecting", start it again: "Live" without a reload; the log keeps 30 rows and new rows arrive at the top without the others flickering; the light page stops polling while the tab is hidden (Network panel) and resumes when shown.

### 7. Media and lazy loading
- **Better:** no layout shift, the right `srcset` candidate per viewport, images below the fold load late, more images appended before the end is reached, the lightbox is a real dialog with keyboard navigation and focus return, deep links work.
- **Tool:** Lighthouse CLS 0; Network panel on load: only the first twelve thumbnails, at 400 px wide on a narrow viewport; Rendering, "Layout Shift Regions": nothing flashes while images arrive; `pnpm weight`: the light page ships no JS.
- **Hand:** scroll: the next twelve appear before the bottom; "Load more" works as the fallback; open an image: arrow keys move, Escape closes, focus returns to the thumbnail that was current; reload with `#photo-07` in the URL: the lightbox opens on that image; emulate reduced motion: no transition when opening.

### 8. Cross-cutting concerns
- **Better:** no flash of the wrong theme, `lang` follows the language, a server-set cookie session, protected content only after the server confirms, redirect after login that cannot be abused.
- **Tool:** Performance panel recording with screenshots on a reload in dark mode: the first frame is already dark; Application, Cookies: `session` with `Path=/` and `SameSite=Lax`; flows "account heavy: login, protected content, logout" and "guarded route redirects to login".
- **Hand:** choose Dark, reload with CPU throttling at 6x: no white flash; choose 日本語: strings swap, `document.documentElement.lang` is `ja`, and it survives a reload; password `demo` signs in and the profile block appears; delete the cookie in Application and reload: signed out; open `/account/heavy.html?next=/dynamic/heavy.html%23/new`, sign in, you land there; `?next=//evil.example` is ignored.

### 9. Content pipeline
- **Better:** articles are HTML at build time with no JS, the index, tags, tables of contents, search index, feed and sitemap are generated, adding a Markdown file needs no code.
- **Tool:** `pnpm check` (every article in the sitemap, every TOC anchor present); `pnpm weight` (0.0 kB JS on articles); flow "content heavy: tag filter highlights and filters"; `curl -s <url>/feed.xml | xmllint --noout -`.
- **Hand:** scripts off: the index lists all five articles; scripts on: search "signals" filters the list and the count updates; click a tag: the URL gets `?tag=` and the tag is highlighted; an article has reading time, a working table of contents and older/newer links; drop a sixth `.md` with front matter into `content-src/articles/`, rebuild: it is in the index, the feed, the sitemap and the search index.

### 10. Data grid
- **Better:** lower sort and filter time (printed on the page) for 50,000 and 200,000 rows, typing stays smooth with the work in a worker, only visible rows are in the DOM, keyboard and ARIA grid semantics kept, CSV export of the filtered order.
- **Tool:** flow "table heavy: worker generates rows, sort, filter"; the page's "sorted and filtered in N ms on the worker" versus "on the main thread"; Elements panel: around 30 `.grid-row` elements (visible rows plus overscan) whatever the row count; Performance panel while typing in main-thread mode shows long tasks, worker mode shows none.
- **Hand:** choose 200,000 rows and scroll to the end without jank; type a filter in main-thread mode (input lags) then worker mode (it does not); click headers for both sort directions; click, Shift-click a range, arrow keys and Space; Export CSV: rows equal the filtered count plus a header; Accessibility tree: `grid`, `aria-rowcount`, `aria-selected` on rows.

### 11. Composite widgets
- **Better:** the light page stays zero-JS with native elements; the heavy widgets meet the ARIA authoring patterns (roles, roving tabindex, `aria-activedescendant`, typeahead, focus return, outside-click dismissal) with less code than the baseline, or a headless library does it for you.
- **Tool:** `pnpm weight` (components light 0.0 kB JS); flow "components heavy: palette opens with Ctrl+K and filters"; Accessibility tree: `tablist`, `tab`, `tabpanel`, `combobox`, `listbox`, `option`, `menu`, `menuitem`.
- **Hand:** light: opening one accordion closes the other; Actions menu closes on outside click and Escape and sits under its button; the dialog opens from the invoker button and closes with Escape; the datalist suggests. Heavy: tabs with arrow keys, Home and End; combobox: type "sv", ArrowDown, Enter selects and `aria-activedescendant` follows; menu button: ArrowDown opens on the first item, typing "d" jumps to Delete, Escape returns focus to the button, Tab closes without stealing focus; Ctrl+K, type "grid": two results, Enter navigates.

### 12. Motion
- **Better:** the light page stays CSS-only; list reorder, enter and leave animate from element identity (FLIP) without a library, or the framework ships it; reduced motion is honoured everywhere; layout changes use a view transition.
- **Tool:** Rendering, "Emulate CSS prefers-reduced-motion: reduce", then use every control: nothing animates; Performance panel during Shuffle: transforms and opacity only, no layout storms; `pnpm weight` for the light page.
- **Hand:** light: the progress bar tracks scrolling, items reveal as they enter, the popover fades in and out and stays in the DOM while fading, cards lift on hover and focus. Heavy: Shuffle and Sort slide tiles, Add scales in, Remove fades out then the rest slide, Switch layout morphs tiles (Chromium), a thrown card overshoots and springs back, arrow keys nudge it and Escape releases it.

### 13. Offline and installable
- **Better:** installable with a valid manifest, a service worker whose strategies behave as stated (network first for pages and API, stale-while-revalidate for assets, a fallback page), and an update that waits for acceptance.
- **Tool:** `pnpm check` (manifest icons and start URL exist); Application, Manifest (no errors), Service Workers (scope `/offline/`), Cache Storage (entries after a visit).
- **Hand:** on the heavy page press "Fetch posts", switch the Network panel to Offline, reload: the page comes from the cache and "Fetch posts" reports "served by service-worker cache"; open `/offline/missing.html` offline: the fallback page; back online, change `VERSION` in `public/sw.js`, "Check for update": the update button appears, nothing changes until you press it; "Clear cache" empties Cache Storage. Light: the connection line flips with the Offline toggle; Chrome offers Install from the address bar on localhost.

### 14. Async consistency
- **Better:** no skeleton flash on refetch, no screen showing a mix of old and new data, stale responses dropped, a failed source retried alone, optimistic updates rolled back on refusal.
- **Tool:** Network throttling with 2 s added latency, then click tabs or change posts quickly: the page's timeline logs "stale response dropped" and "committed in one paint".
- **Hand:** light: with "Keep the old content" off a skeleton flashes on every click, on it dims and swaps; heavy: atomic on, change the post, all three panels change together; atomic off, they fill one by one; when status fails, "Retry status only" refetches only that panel; Like flips at once, and on a 503 it rolls back with a toast and the log says so.

### 15. State across navigation
- **Better:** Back restores scroll and filter; hidden views keep scroll, typed text and a paused animation at no cost; the destroy mode is visible in the counters.
- **Tool:** Elements: hidden panels carry `hidden` and `inert`; Performance monitor: no frames while the Live tab is hidden; the page's "Panels created" counters.
- **Hand:** light: filter "an", scroll, open a row, Back: same filter and position; reload on a detail URL shows the detail. Heavy: scroll the list box, type in the form, note the frame count, switch tabs and come back: scroll and text kept, frames continue from where they paused; untick "Keep hidden tabs alive": counters rise on every return and state is gone; hide the browser tab: frames pause.

### 16. Server functions
- **Better:** calls look like function calls, same-tick calls travel in one request, identical in-flight calls are shared, validation errors arrive per call, the guarded call redirects to sign-in, the live value updates without polling.
- **Tool:** flow "rpc heavy: batch is one request"; the page's "N requests carried M calls"; Network panel: POST bodies to `/api/rpc` are arrays, `/api/rpc/live` is an EventStream.
- **Hand:** light: one click, one time; heavy: type "ro" quickly: fewer requests than keystrokes and the right results; the batch button reports "came back in 1 request"; publish with a short title: the server's message; signed out, publish: redirected to the account page; the live value changes every two seconds.

### 17. Sync and local-first
- **Better:** edits apply locally first, queue while offline, replay once without duplicates, versions detect conflicts, conflicts are resolvable, other devices appear live.
- **Tool:** flow "sync heavy: add a note and it syncs"; Application, Local Storage, key `sync-heavy`: the outbox and notes; Network panel: one POST to `/api/sync` per replay, with `opId`s.
- **Hand:** turn off Wi-Fi (real offline: `navigator.onLine` is false but localhost still answers), add two notes and edit one: "2 changes in the outbox", tags read "waiting to sync"; press the other-device button: it writes to the server; Wi-Fi on: the outbox pushes, your edit to the first note comes back as a conflict, "Keep mine" or "Take theirs" settles it, and the feed logged the other device's change. With DevTools Offline instead (it blocks every request, including the other-device button's), press that button from a second tab. Press "Replay outbox" twice: no duplicates appear.

### 18. Morphing and streaming HTML
- **Better:** focus, typed text and node identity survive a server-rendered update; a chunked response is applied progressively; reordering does not reset running animations where `moveBefore` exists.
- **Tool:** flow "morph light: typed text survives a morph refresh"; in the Console, on a list item run `$0.marker = 1`, wait for a refresh: the marker is still there under Morph and gone under Replace.
- **Hand:** light: type in the box and wait three seconds: text and focus kept, "lost 0 times"; switch to Replace: the counter climbs and focus drops. Heavy: "Stream it": six chunks appear one by one over about two seconds and the status counts them; "Reverse with insertBefore": the bars restart; "Reverse with moveBefore": they keep running (Chromium), or the page says the fallback was used.

### 19. Platform navigation
- **Better:** cross-document transitions, prerendered pages on hover, a router on real URLs that intercepts when it can and falls back to full loads when it cannot, deep links and reloads served by the server.
- **Tool:** flow "navigation heavy: intercepted navigation renders a post"; Application, "Speculative loads" (Chrome): the hovered page shows as prerendered and the click causes no request; Network panel on the heavy page: a click fetches only `/api/posts/3`, no document.
- **Hand:** light: hover a link for a moment, click: instant, and the title morphs; heavy: click a post, the URL becomes `/navigation/app/posts/3`, the title changes, the entries list grows, Back and Forward buttons follow `canGoBack`; reload on that URL: the shell is served and the post renders; focus and scroll reset after the transition; a browser without the Navigation API still navigates with full loads (the support line says which mode is active).

### 20. Error boundaries
- **Better:** nothing uncaught is lost (light); a failing section shows a fallback, retries with backoff, then offers a button, and the rest of the page never notices; the same failure is counted, not resent.
- **Tool:** the light page's "Reports sent" and "server has" match; Console: no unhandled errors besides the deliberate ones; the heavy page's per-section counts.
- **Hand:** light: each button adds a log line and a toast and increments both counts. Heavy: the flaky section fails about half the time, shows "Retrying in 0.5s" then "1s" then a button; the stable section is untouched; tick "Simulate a render bug": only the third section fails; the reports log says "counted … not resent" from the second occurrence; untick and it recovers.

### 21. Observability
- **Better:** the port's own vitals on these pages are no worse, and the framework exports a trace or at least timings you can read.
- **Tool:** compare the on-page vitals with Lighthouse and with the Performance panel; heavy: "Export trace JSON" and `jq '.resourceSpans[0].scopeSpans[0].spans | length' trace.json` (six in the baseline).
- **Hand:** light: each button worsens the number it names (CLS, long tasks, INP); heavy: "Trace" draws a waterfall with two server spans taken from `Server-Timing`, and the summary says resource timing saw the `api` entries. A port's own server must send `Server-Timing` too, or that part of the measurement disappears.

### 22. Security hardening
- **Better:** fewer inline scripts the framework needs allowed (count the hashes or nonces), Trusted Types compatible, untrusted HTML sanitised, CSRF handled.
- **Tool:** `curl -s <url> | grep -c '<script>'` for inline scripts; the light page's "Policy in effect" lists the hashes; Console shows the violations the buttons cause and nothing else; flow "security heavy: raw innerHTML refused, csrf ok and rejected".
- **Hand:** light: "Try eval" is refused, the injected inline handler does nothing and logs a violation, the third-party script does not load. Heavy: "Render through the policy" keeps the text and drops the `onerror`, the `javascript:` link and the script; "Try raw innerHTML" is refused (Chromium); the form is accepted with the token and rejected with 403 without it. For a port, note every inline script, hydration payload or style the framework injects that needed a nonce or hash to keep the page working.

### 23. Styling strategy
- **Better:** scoping that does not leak and needs no runtime, tokens reused from one place, platform features (`@scope`, container queries, `@property`, `:has()`, logical properties, subgrid) passing through the toolchain untouched.
- **Tool:** `pnpm weight` (CSS bytes per page, and whether CSS arrived inside JS); Coverage panel: unused CSS per page; Elements, Computed: the paragraph after the card's slot boundary is not styled by the card's rules.
- **Hand:** light: switch theme, the swatches follow; the layered box is accent-coloured because the theme layer wins; heavy: drag the box past 26 rem, the card goes side by side; hover the meter, it animates; type an invalid email and leave the field, the message shows and the button stays disabled until it is valid; tick Right-to-left, the block mirrors; the three feature cards keep their rows aligned.

## Replacing `src/lib`

Every file here is something the framework should make unnecessary. When it does, verify that nothing in the file's job was lost.

| File | The replacement must still | Verify |
|---|---|---|
| `dom.js` | Render the same landmarks, roles and attributes the pages rely on. | Tool: the dist checker on the port; the Accessibility tree. Hand: compare the DOM of one light and one heavy page in Elements. |
| `store.js` | Immutable updates, undo and redo, persistence, external replace for cross-tab sync. | Tool: flow "state heavy". Hand: Ctrl+Z after a drag, reload, second tab. |
| `router.js` | Params and query, cancel in-flight work on navigation, run cleanups, announce the route. | Tool: flow "dynamic heavy: list, search, detail, back"; Network panel shows cancelled requests. Hand: `#route-announcer` changes, focus lands on the heading. |
| `api.js` | Share concurrent requests, cache with a TTL, prefetch, invalidate after mutations. | Tool: Network panel counts (one request for two opens within 30 s; prefetch on hover; refetch after publish). |
| `rows.js` | Unchanged: it is the data code shared with the worker. | Tool: the grid's printed sort time. |
| `rpc.js` | Batch same-tick calls, share identical in-flight calls, subscribe over SSE. | Tool: flow "rpc heavy"; the page's requests versus calls. |
| `sync.js` | Outbox with replay, versions, conflicts, change feed, idempotent operations. | Tool: flow "sync heavy"; Local Storage. Hand: the offline procedure under pattern 17. |
| `morph.js` | Keep focus, text and node identity across a server-rendered update. | Tool: flow "morph light"; the `$0.marker` check. |
| `agent.js` | Register tools only where `document.modelContext` exists and never throw without it. | Hand: in a browser with WebMCP the console prints "contact form registered as a WebMCP tool"; everywhere else the console is silent. |
| `elements.js` | A component with connect and disconnect lifecycle that stops its timer when removed. | Hand: the relative time updates every 30 s on a post; after navigating away and back ten times the Memory panel shows a flat heap. |
| `toast.js` | One polite live region, stacking, dismissal. | Tool: Accessibility tree shows `status`. Hand: trigger two toasts; click dismisses. |
| `theme.js` and the inline script in `head.html` | Apply the saved theme before first paint. | Tool: Performance filmstrip of a reload in dark mode. |
| `i18n.js` | Swap strings at runtime and keep `<html lang>` in step. | Hand: switch to 日本語, read `document.documentElement.lang`, reload. |
| `auth.js` | Render from the cookie, confirm with the server, safe redirect after login. | Tool: flows "account heavy" and "guarded route". Hand: delete the cookie; try an unsafe `?next=`. |

## Recording

Put the numbers in the framework's sheet next to the baseline's, with the date, the machine and the versions. Fill the rubric in `README.md` the same day. Two free-text fields matter more than the scores: what the framework decided for you, and where you fought it. File the port under `impl/<name>/` or link the repository from the sheet.
