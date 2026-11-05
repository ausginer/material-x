# Profile pages

Standalone pages for recording Chrome Performance traces of `@ydinjs/drag2`. They are not a benchmark harness: nothing here measures or asserts anything, and no page logs.

## Source revision and build mode

- **Source:** `src/` at `678a6ab18`. Run `git log -1 --format=%h -- packages/drag2/src` to see whether the checkout you are recording has moved since.
- **Entry points:** each page imports the public entries (`src/sortable.ts`, `src/sortable/y.ts`, `src/free-drag.ts` and so on) and nothing below them. They are imported from source rather than from the built package, so a trace maps to the TypeScript that was compiled. `@ydinjs/box-quad` comes from its built `index.js`.
- **Build:** `vite build` in production mode, minified, with source maps carrying `sourcesContent` and `__DEV__` folded to `false`. No Vite plugin is installed, so there is no traits transform.
- **One build per page:** each page gets its own script, stylesheet and source map, and its bundle holds only its own composition. A module-level call in the page's script constructs the controller during load.
- **Serving:** `vite preview` serves the static output, so there is no dev server, HMR client or Storybook. An unknown URL returns 404 rather than falling back to another scenario.

## Launch

Build `@ydinjs/box-quad` once if `packages/box-quad/index.js` is missing (`npx just build` in that package). Then, from `packages/drag2`:

```sh
npx just profile         # build every page, then serve on port 4180
npx just profile-build   # build only, to .vite/profile
npx vite preview -c bench/profile/vite.config.ts   # serve the last build
```

Ctrl-C stops the server. To build one page: `PROFILE_PAGE=sortable-basic.html npx vite build -c bench/profile/vite.config.ts`. Output is not cleared in that case, so `just profile-build` is the clean form.

## Recording

1. Open the URL in a fresh Chrome profile or incognito window, so extensions stay out of the trace. Keep the window at least 720 px tall, so the list fits without scrolling.
2. **Load:** use _Record and reload_ in the Performance panel, and stop once the page is idle.
3. **Interaction:** reload the page, start recording, perform the interaction below once, wait for the page to settle, and stop.

Rows are 50 px apart. In the table, _the drag_ means: press **Item 2**, move in small steps to the **Item 7** row while drifting about 70 px to the right, and hold there. The drift matters on the landing page, because a drop exactly on its slot has no distance to land across and starts no animation.

Reload between recordings. Expected orders are given as item numbers, and only the moved items are shown before `…`.

| URL | Scenario | Entry | Interaction to record | Expected result |
| --- | --- | --- | --- | --- |
| [`/sortable-basic.html`](http://localhost:4180/sortable-basic.html) | Basic pointer sortable: `sortable + y()` | `sortable-basic.ts` | The drag, then release. | `1,3,4,5,6,7,2,8…` |
| [`/`](http://localhost:4180/) | Landing and layout animation: `sortable + y() + landing() + layoutAnimation()` | `complete.ts` | The drag, then release. | Rows animate aside during the drag. The item lands over 200 ms. `1,3,4,5,6,7,2,8…` |
| [`/free-drag.html`](http://localhost:4180/free-drag.html) | Free drag: `freeDrag` | `free-drag.ts` | Press the box, move in small steps about 200 px right and 160 px down, release. | The box stays where it was dropped. |
| [`/sortable-keyboard.html`](http://localhost:4180/sortable-keyboard.html) | Keyboard sortable: `sortable + y()`, rows focusable | `sortable-keyboard.ts` | Before recording: click the page background and press Tab, which focuses Item 1. Then record ArrowDown three times and ArrowUp once, pausing between presses. | `2,3,1,4…`, with Item 1 still focused. |
| [`/sortable-async.html`](http://localhost:4180/sortable-async.html) | Asynchronous resolution: `onReorder` settles after 300 ms | `sortable-async.ts` | The drag, then release, then wait at least 500 ms. | The placeholder holds the slot for 300 ms. `1,3,4,5,6,7,2,8…` |
| [`/sortable-cancel-escape.html`](http://localhost:4180/sortable-cancel-escape.html) | Cancellation by Escape | `sortable-basic.ts` | The drag, press Escape while holding, then release. | The placeholder goes on Escape, and the pointer no longer moves anything. Order unchanged. |
| [`/sortable-cancel-callback.html`](http://localhost:4180/sortable-cancel-callback.html) | Cancellation from a callback: `requestCancel()` in `onStart` | `sortable-cancel-callback.ts` | The drag, then release. | The drag ends as soon as it activates. Order unchanged. |
| [`/sortable-destroy-callback.html`](http://localhost:4180/sortable-destroy-callback.html) | Destruction from a callback: `requestDestroy()` in `onReorder` | `sortable-destroy-callback.ts` | The drag, then release. | `1,3,4,5,6,7,2,8…`. A second drag does nothing. |

The two cancellation pages are the same composition as the basic page. The Escape page runs the basic page's module, built on its own, and differs only in the input recorded.

## Verification

Checked on `678a6ab18` in headless Chromium through Playwright, using trusted CDP input against `vite preview`, not the page's own events:

- Every interaction above produced its expected result, with no console output, page error, failed request or WebSocket.
- A repeat of the drag also landed correctly on the basic, landing and asynchronous pages.
- A trace of each page shows one script compiling and evaluating, plus the expected `pointer*` or `keydown` events.
- All 24 delivered HTML, JS and CSS files contain no Vite client, `import.meta.hot`, Storybook, React DOM or WebSocket string. `/@vite/client`, `/@hmr`, `/sb-preview/runtime.js` and `/iframe.html` return 404.
- Each source map lists `src/`, the page's own entry and `@ydinjs/box-quad`, and nothing else. Free-drag modules appear only in the free-drag map, and landing and layout-animation modules only in the `/` map.

Traces were recorded only to check this, in headless Chromium. Nothing here is a performance result.