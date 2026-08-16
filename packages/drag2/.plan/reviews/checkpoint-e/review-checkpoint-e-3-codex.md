# Checkpoint E — final targeted closure

**Reviewer:** Codex  
**Date:** 2026-08-17  
**Scope:** E-03, E-04, E-07, and E-08 only, against the current tree

## Verdict

E-03, E-04, and E-07 are **closed**. E-08's isolated free-drag TypeDoc gate is closed, but E-08 remains **materially open** because the prior failure-stage prose disposition has not been completed. Checkpoint E therefore is not fully closed.

| Finding | Result |
| --- | --- |
| E-03 | **Closed.** The permanent quality-route destroy-then-throw regression discriminates the original missing liveness guard. |
| E-04 | **Closed.** The landing-runner regression observes the rendered position while settlement is still pending, before cleanup can hide a forbidden late write. |
| E-07 | **Closed.** Active prose now describes the committed rejected verdict; accepted free drag never enters landing, and `undefined` is not presented as a reachable duration-domain value. |
| E-08 | **Open on failure-stage prose only.** The deterministic isolated TypeDoc gate is closed, but active contract/test prose still contains the retired names and categorical attribution claim identified by the prior disposition. |

## E-03 — closed

`tests/free-drag/validation.browser.test.ts:564-595` permanently drives the quality route: `home()` destroys the controller and then throws, after which the test requires no `onError`, no terminal, and no platform report. This reaches the quality-track `anchorTarget` call rather than the separately covered admission path. Without the `queue.closed` guard before the behavior failure report (`src/kernel/kernel.ts:734-748`), the error collection would be non-empty, so the row distinguishes the original defect.

The focused browser regression passed.

## E-04 — closed

`tests/free-drag/actions.browser.test.ts:135-187` now withholds the landing runner's `done()` callback, dispatches `moveTo(FAR)`, drains a microtask/frame/microtask sequence while the operation remains settling, and observes `[40, 30]` before allowing the join. Only after that observation does it finish the runner and assert final inline-style restoration and one terminal.

This is the required discriminator: without the free-drag phase guard, the queued late action would expose `[400, 300]` during the held-open settlement. Presentation cleanup can no longer erase the evidence before the assertion. The focused browser regression passed.

## E-07 — closed

The formerly stale claims are no longer operative:

- `.plan/contract/07-free-drag-contract.md:220-222` states that the committed verdict survives and corrects the impossible accepted-drop arm: accepted free drag never reaches landing creation.
- `.plan/contract/05-lifecycle-invariants.md:610` states the executable case as the committed rejected verdict and explains that `undefined` is coalesced before the platform sees it.
- `.plan/contract/07-free-drag-contract.md:514` gives the same corrected acceptance criterion.

The old formulations remain only as struck historical text paired with their corrections; there is no active accepted/`undefined` lifecycle claim. The permanent Infinity row (`tests/free-drag/validation.browser.test.ts:404-430`) still drives the rejected path and passed.

## E-08 — materially open on the prior prose disposition

The isolated TypeDoc gap is **closed**. `tests/docs.node.test.ts:192-247` runs exactly `free-drag.ts`, `drag.ts`, and `free-drag/feature.ts`, makes warnings fatal with `--treatWarningsAsErrors`, requires exit code zero, reads the emitted artifact, and requires the exact three-module set. It no longer depends on captured stdout. The focused test passed twice in standalone runs.

The failure-stage prose gap is **not closed**. Although `src/kernel/errors.ts:75-92` now correctly distinguishes caller attribution from seam position, the active text identified by the previous review remains unchanged:

- `.plan/contract/02-kernel-behavior-contract.md:182` still names `INSERTION` and `PLACEHOLDER_MOVE`.
- `.plan/contract/02-kernel-behavior-contract.md:1860` still lists `INSERTION`, `PLACEHOLDER_MOVE`, and `REORDER_RESOLUTION`.
- `.plan/contract/02-kernel-behavior-contract.md:1874` still says categorically that the axis is “fault attribution, not pipeline position” and uses `REORDER_RESOLUTION`.
- `tests/kernel/errors.node.test.ts:117` repeats the categorical attribution claim.
- `tests/COVERAGE.md:437` still uses `REORDER_RESOLUTION` as a current stage name.

The error-mapping tests pass (5/5), so this is not an implementation or mapping failure. The specific remaining disposition is prose-only: replace the retired stage names and narrow the active categorical attribution wording to the call-site/seam-position semantics already recorded in `src/kernel/errors.ts`.

## Focused verification

```text
E-03, E-04, E-07 browser rows: 3 passed
isolated free-drag TypeDoc row: 1 passed (run twice)
kernel error-mapping rows: 5 passed
```

No implementation, contract, or test file was modified.