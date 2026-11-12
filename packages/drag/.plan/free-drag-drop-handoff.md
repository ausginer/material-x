# Free drag drop handoff

**Done.** The unit landed at `71f20df20` and `7cb2207ae`. [`free-drag-drop-report.md`](free-drag-drop-report.md) records it, and [`free-drag-drop-assessment.md`](free-drag-drop-assessment.md) reads it: `DRD-48` conforms, and `DRF-22` is closed.

**For:** one `implementer` unit on `drag/performance`. **Base:** the commit that carries this handoff. Its `packages/drag/src` is `bf9d1caed`'s.

**Governing records:** `DRD-48` in [`00-index.md`](00-index.md), with `DRD-33` C6 and C7, `DRD-40` properties 4 and 6, and `DRF-22`. [`performance-plan.md`](performance-plan.md) §2 P3. The reasons are in [`performance-drop-assessment.md`](performance-drop-assessment.md) §4.

**Goal:** after this unit, `freeDrag`'s drop names the target under the release position and clamps against the bounds as the tree stands at the drop, even after a scroll whose event hasn't reached the library yet. No sample or frame reads more.

## Boundaries

**Change only:**

- `src/free-drag/operation.ts`'s `drop()` (`DRD-48` property 1);
- the documentation of `invalidate` in `src/free-drag/drop-targets.ts` and `src/free-drag/bounds.ts` (property 4). No runtime change in either file;
- the tests for W3 and W4 (property 6);
- [`contract.md`](contract.md) `DRI-20` and `DRI-21`, its change record and its current-state paragraph, and the package README's drop-target paragraph (property 5). The contract text is `DRD-48`'s, as written there.

**Do not change:** `sortable` or `DRD-47`'s confirmation, the kernel, samples, frames, the scroll and resize listener, activation, `settle`, the landing, `home`, any `bench/` file, any row, injection or floor entry, any ceiling, or any recorded reading.

**Do not run** `compare.ts`, `--prove`, `--floors` or a campaign. No row reaches the change (`DRD-48` property 7).

## Items

### 1. The base

Before any change, `git diff --stat bf9d1caed HEAD -- packages/drag/src packages/drag/tests` is empty. Record it in the report.

### 2. The drop

`DRD-48` properties 1 to 4. In short:

- before the drop computes the motion, and before the tracker's `drop()`, the bounds and the tracker are marked stale through their `invalidate` members;
- a third-party tracker or constraint receives the same call, and no published type gains a member;
- the documentation of each `invalidate` names the drop among its callers.

How the call is written is the unit's choice. State it in the report.

### 3. The witnesses

Write the tests with the `test-component` skill: real custom elements and real browser input. `DRD-47`'s W1 in `tests/sortable.browser.test.ts` is the pattern for the release listener.

| Witness | What it shows | Mutation that must fail it |
| --- | --- | --- |
| **W3** | `freeDrag` with `dropTargets` and at least two targets in a scrolling container. A drag waits a frame with the pointer over one target. A capture-phase `pointerup` listener on the window, added before the press, scrolls the container so that another target, or none, is under the release position. The request's `target` is the one under the release position after the scroll | **M3:** the tracker not marked stale at the drop |
| **W4** | `freeDrag` with an element `bounds` inside a scrolling container. A drag holds the visual clamped at the bounds' edge and waits a frame. The same kind of listener scrolls the container by more than a pixel. The drop position, as the request's `localDeltaX` or `localDeltaY` shows it, is the clamp against the box after the scroll | **M4:** the bounds not marked stale at the drop |

Run each mutation on a scratch copy or an uncommitted edit, and keep its output. Report the engine each one ran in. W3 and W4 must also fail at `bf9d1caed`'s source. "should re-read the targets after a scroll" and every other test in `tests/drop-targets.browser.test.ts` still pass.

### 4. The contract and the README

Apply `DRD-48` property 5 in the same commit as item 2: `DRI-21`'s drop bullet and `DRI-20`'s sentence as written, a change record row that names `DRD-48` and `DRF-22`, a sentence in the contract's current-state paragraph, and the README sentence.

### 5. The cost

- **Reads.** Count the layout reads at one drop with ten targets and an element `bounds`, with a warm cache, using the census helper in `tests/hot-path.browser.test.ts`. Report the count beside the count at `bf9d1caed`'s source. The expected difference is eleven: ten targets and one box. This is reported, not a gating test.
- **Size.** Run `node bench/size/measure.ts` at the unit's last code commit and at `bf9d1caed`'s source, one after the other. Report each composition's change. The control is "draggable alone" and the three `sortable` rows, which read 0.

### 6. The other checks

- the three-engine suite, with only the known failures;
- the census tests in `tests/hot-path.browser.test.ts`;
- the Chromium suite. Its known failures are the five size rows under `DRO-4`, and the rows with `freeDrag` may grow by the change's bytes.

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | Empty |
| `git diff --stat <base>..HEAD -- packages/drag` | Only the files under §Boundaries, the report and `measurements/` |
| W3 and W4 | Pass in every engine the suite runs, and fail at `bf9d1caed`'s source |
| M3 and M4 | Each fails its witness |
| Item 5 | The read counts and the size table, with the control at 0 |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck |
| Markdown | `handoff.md`'s Markdown checks |

## Report

Write `free-drag-drop-report.md` beside this file. Save the witness, mutation, suite and size outputs under `measurements/`, unedited, each with the commit and the engine. The report gives the form of the call, every check above, and item 5's figures.

## Return to the architect

Stop and return if:

- item 1 isn't empty;
- W3 or W4 passes at `bf9d1caed`'s source in every engine, so the window can't be shown that way;
- M3 doesn't fail W3, or M4 doesn't fail W4, in every engine;
- an existing test expects the drop to use rects or a box measured before it;
- a size row that is green at `bf9d1caed` turns red;
- the change needs a file outside §Boundaries.

## After this unit

The architect reads the report and records the result under `DRD-48` and `DRF-22`. The owner accepts or refuses the change's bytes and its reads at the drop (`DRD-33` C7, CONTRIBUTING §0). `DRF-21` stays open until the next bytes reading that a report or decision uses.