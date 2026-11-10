# Probes for the drag architecture plan

Evidence for [`architecture-plan.md`](../../architecture-plan.md) and [`deferred-integration.md`](../../deferred-integration.md). Prototype and lab sources are kept as `.txt` so nothing here is compiled, linted or tested.

**Input.** `7723f3e8a` for production and the single-pass prototype. `b739c5449` for the independent model, `packages/drag2/bench/architecture-independent/drag.ts`.

## Setup

Run in a throwaway worktree of `7723f3e8a`, with a `packages/drag2/prototype/` directory holding:

| File | Source |
| --- | --- |
| `gesture.ts`, `sortable.ts`, `free-drag.ts` | `packages/drag2/.plan/probes/single-pass/*.ts.txt`, suffix removed |
| `independent.ts` | `drag.ts` at `b739c5449` |
| `lab.ts`, `cost-lab.ts`, `gaps-lab.ts`, `hit-axis.ts` | The `.ts.txt` files here, suffix removed |

The drivers import esbuild and Playwright from `/workspaces/material-x/node_modules` and start `/usr/local/bin/chrome`, which is Chromium, headless. Run them with `node` after removing the `.txt` suffix.

## Commands

| Question | Command | Result |
| --- | --- | --- |
| Foreign code, clipping, stacking, scale, zoom, iframe, `flow-1` | `node run.mts <prototype> out.json` | [`lab-results.json.txt`](lab-results.json.txt) |
| Per-move cost, cached axis, hit-test axis, independent | `node cost.mts <prototype> out.json` | [`cost.json.txt`](cost.json.txt) |
| Guarantees from the 370 tests, production against single-pass | `node gaps.mts <prototype> out.json` | [`gaps.json.txt`](gaps.json.txt), [`gaps-summary.txt`](gaps-summary.txt) |
| Bytes attributed by module | `node attribution.mts <prototype>` | [`attribution.txt`](attribution.txt) |
| The 370 tests, one row each | `python3 classify.py <dir with the title TSVs> out.tsv` | [`test-classification.tsv`](test-classification.tsv) |
| `reportError` with a typed wrapper: timing, cause identity, realm, what a logger sees | `node report-error.mts chromium firefox > out.json`, from the checkout root, needing no prototype | [`report-error.json.txt`](report-error.json.txt) |

[`titles.mjs.txt`](titles.mjs.txt) extracted the [kernel](kernel.titles.tsv) and [sortable](sortable.titles.tsv) titles from the two browser test files at `7723f3e8a`.

The `baseline-b*` and `legacy-measure` files support the deferred integration note and are not part of the architecture comparison.

## Corrections made while running these

- `lab.ts` first used `insertBefore(item, request.before)`. `before` names the item ahead of the gap, so single-pass orders read one slot short. The kept file and results use `request.after`. The misreading is cited in the plan as evidence about those two names.
- `gaps.mts` first read the abort signal from the wrong argument, counted an inner list's own styles as a leftover, and had a `beforetoggle` listener that destroyed on the second drag. The kept results follow those fixes.

## Limits

One machine, headless Chromium, real mouse through CDP. The scenarios share their author's blind spots. The single-pass prototype reuses production's feature modules, so equal traces say little about code both sides share. `gaps` has one positive control: the pinned two-invalidate difference, which must show as `DIFF`.