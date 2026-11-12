# Performance window correction handoff

**For:** one `implementer` unit on `drag/performance`. **Base:** the commit that carries this handoff. Its `packages/drag/src` and `packages/drag/tests` are `501f60ab7`'s.

**Governing records:** `DRD-50` in [`00-index.md`](00-index.md), with `DRD-49`, `DRD-47`, `DRD-44` property 6 and `DRD-40` properties 4 and 6. The reasons are in [`performance-window-assessment.md`](performance-window-assessment.md) §2 and §3, and the size trade-off in its §5.

**Goal:** after this unit, a measurement allocates nothing for the displacement sink, and a paired probe shows whether `xy()`'s shared rebuild is slower than `71f20df20`'s. If it is, `xy()`'s rebuild is one pass again. Runtime comes before the byte ceilings in this unit.

## Boundaries

**Change only:**

- `src/sortable/axis.ts`, `src/sortable/layout-animation.ts`, `src/sortable/rect-index.ts` and `src/sortable/linear-shift.ts`, for `DRD-50` properties 1 and 3;
- the tests for W7 and W8;
- the probe, which isn't a `bench/` file. Run it from a scratch location, and keep its source and output under `measurements/`.

**Do not change:** `y.ts`, `xy.ts`, `operation.ts`, `DRD-49`'s window, growth, scan, confirmation slot and development check, `EQUIVALENCE_SLACK`, the contract, the README, any `bench/` file, `judge`, any row, injection, floor entry or ceiling, or any recorded reading.

**Do not run** `compare.ts`, `--prove`, `--floors` or a campaign. `DRD-49`'s readings at `501f60ab7` stand as its confirmation.

## Items

### 1. The base

Before any change, `git diff --stat 501f60ab7 HEAD -- packages/drag/src packages/drag/tests` is empty. Record it in the report.

### 2. Range settling

`DRD-50` property 1:

- `settle` settles exactly the slots in the range it receives, in the buffer and element array as given;
- `RectIndex`'s measurement passes the cache's own buffer and element array, with the range it read, and allocates nothing for the sink. That covers both `y()`'s growth and `xy()`'s rebuild;
- the drop's confirmation and `linearShift`'s probe pass their one-slot scratch with a one-slot range, and otherwise read and allocate what they do now;
- `settle`'s documentation in `axis.ts` states the range, and `measure`'s comment no longer describes a view and a copy.

The parameter form is the unit's choice, for example a first slot and an end slot like `measure`'s. State it in the report.

### 3. The witnesses

Write the tests with the `test-component` skill: real custom elements and real browser input. A spy on `layoutAnimation`'s sink works the way "should call the layoutAnimation sink with its receiver, with rows in flight" does.

| Witness | What it shows | Mutation that must fail it |
| --- | --- | --- |
| **W7** | With a sink composed, every `settle` call that a measurement makes receives the cache's buffer and element array, the same two objects across the operation, and the range it read. Cover a `y()` drag whose window grows across at least three slots after slot 0, and an `xy()` rebuild | **M7:** `501f60ab7`'s call in `measure`, with `subarray` and `slice` |
| **W8** | With `layoutAnimation` and rows in flight, a resolution that grows the window over a row in flight holds that row's settled geometry, and the gap equals the gap that the rows' flow positions give, computed in the test | **M8:** a `settle` that ignores the range's start |

How W7 tells a measurement's calls apart from the confirmation's and the probe's, and how W8 puts a row in flight inside the window's growth, are the unit's choices. State them in the report. W8 must fail under M8 because of the gap or the settled geometry, and not only because the development check throws. The flow position can come from a layout value that ignores transforms, such as `offsetTop`.

Run each mutation on a scratch copy or an uncommitted edit, keep its output, and report the engine each one ran in. These must still pass: `DRD-49`'s W5 and W6, `DRD-47`'s W1 and W2, "should call the layoutAnimation sink with its receiver, with rows in flight", "should animate displaced rows with layoutAnimation, in xy() too", and every census and allocation test.

### 4. The probe of `xy()`'s rebuild

`DRD-50` property 2, at the unit's last code commit for item 2:

- **The browser:** Chromium, in one browser process, with `__DEV__` false.
- **The page:** a laid-out field of 2,000 items that wraps, for example fixed-size cells in a `flex-wrap` container, and a placeholder in it. The page is laid out before any timing.
- **The arms:** `before` is `71f20df20`'s `rect-index.ts`, with that commit's `layout-animation.ts` in the case with a sink. `production` is the unit's code, and `control` is a second `production` instance. Each arm has its own `RectIndex` and its own sink.
- **The cases:** no sink, and `layoutAnimation` with nothing in flight.
- **The rounds:** 7 rounds. Each round runs the arms in a rotated order. Each arm discards one warm-up batch, then times one batch of rebuilds, each one `invalidate()` and then `refresh(...)`. A batch lasts at least 100 ms. The reading is the batch's mean per rebuild, in µs.
- **The verdict:** per case, `compare.ts`'s paired rule (`pairedVerdict`). The differences are `production` minus `before` per round, and the A/A differences are `control` minus `production`. "Slower" means higher in at least 6 of 7 rounds, with the median difference above the largest absolute A/A difference. "Faster" is the mirror, and anything else is "no difference shown". Report each case's differences, sign count, median, A/A bound and the `before` median, so the bound reads as a share of a rebuild.
- **The hold** of `DRD-44` property 6: ask the owner's sessions to hold before the browser starts, release them after it ends, and record both times. **The machine record** of `DRD-40` property 4 goes at the head and the foot.

State the batch size and the warm-up, and how the page loads both classes.

### 5. One pass, only on a "slower" reading

If either case reads "slower", apply `DRD-50` property 3. `xy()`'s full measurement collects, reads and packs each slot in one pass over the snapshot, settles once with the cache's own buffer, and leaves the window at every slot. `y()`'s `collect`, `measure` and growth don't change. Then run item 4 again on that form, as a second probe process under its own hold. It must not read "slower".

If neither case reads "slower", don't change the rebuild. Report the bounds.

### 6. The other checks

After the probe, not during it:

- the three-engine suite, with only the known failures;
- the per-sample tests and the census tests;
- the size table at the unit's last code commit. Report each row against the saved records at `501f60ab7` ([size](measurements/2026-11-12-window-size.txt)) and `71f20df20` ([base](measurements/2026-11-12-window-size-base.txt)). If the seven rows without `sortable` don't read as saved, run the base again and say so.

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | Empty |
| `git diff --stat <base>..HEAD -- packages/drag` | Only the files under §Boundaries, the report and `measurements/` |
| W7 and W8 | Pass in every engine the suite runs |
| M7 and M8 | Each fails its witness |
| Item 4 | One process, or two with item 5, each exits 0, with both cases judged |
| The seven rows without `sortable` | 0 against `501f60ab7` |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck |
| Markdown | `handoff.md`'s Markdown checks |

## Report

Write `performance-window-correction-report.md` beside this file. Save the probe's source and output under `measurements/`, unedited, with the machine record and the hold's times. Put the witness, mutation, suite and size outputs beside them. The report gives the unit's choices, every check above, the probe's tables and which branch of item 5 applied, and the size table.

## Return to the architect

Stop and return if:

- item 1 isn't empty;
- the development equivalence check throws in any engine. Don't weaken the check;
- an existing test fails;
- W7 passes under M7, or W8 under M8, in every engine;
- the probe can't run all three arms in one page, or a case produces fewer than 7 rounds;
- the one-pass form of item 5 still reads "slower";
- a row without `sortable` changes size;
- the change needs a file outside §Boundaries.

**Not a return, and reported:** a `sortable` row that turns red. Runtime comes first in this unit, and the owner decides on the bytes.

## After this unit

The architect reads the report and records the result under `DRD-50`. The owner then accepts or refuses the window's bytes, with this unit's figures (assessment §5). No ceiling moves. `DRF-21` stays open until the next bytes reading that a report or decision uses, and `DRD-45` property 9 before any `--prove` or `--floors`.