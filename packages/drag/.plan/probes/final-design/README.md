# Final design probe

Evidence for [`00-index.md`](../../00-index.md), run on 2026-11-06 at `599684791` with real input through Playwright: Chromium, Firefox and WebKit.

| File | What it is |
| --- | --- |
| [`run.mts.txt`](run.mts.txt) | The driver. Rename to `.mts` and run with `node`, with a `node_modules` link to the repository's beside it |
| [`lab.ts.txt`](lab.ts.txt) | The page bundle: the prototype's `draggable` and `sortable`, `box-quad`, and a throwaway `localDelta` |
| [`results.json.txt`](results.json.txt) | Each observation per engine |

**What it shows:** the elevation options, a flight clipped by an ancestor, top-layer state after `insertBefore`, focus after reorders and on lift, the click after destruction, and pointer tracking and resize through `box-quad` with no lift.

**Limits:** this measured no production code. The elevation and focus-restore cases run the platform calls directly, not a kernel with those changes. Mouse input only.