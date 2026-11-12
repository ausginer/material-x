# Performance window handoff

**For:** one `implementer` unit on `drag/performance`. **Base:** the commit that carries this handoff. Its `packages/drag/src` is `71f20df20`'s.

**Governing records:** `DRD-49` in [`00-index.md`](00-index.md), with `DRD-47`, `DRD-46` property 8, `DRD-40` properties 4, 6 and 7, `DRD-44` property 6 and `DRD-45` property 9. [`performance-plan.md`](performance-plan.md) §2 P3. The reasons are in [`free-drag-drop-assessment.md`](free-drag-drop-assessment.md) §2, and the costs in [`performance-trace-report.md`](performance-trace-report.md) §Item 4, candidate 1.

**Goal:** after this unit, `y()` measures only the rows between the placeholder and the pointer, and one beyond, instead of every row at the activation and after every invalidation. The gap is the one a full scan gives. A paired run against `71f20df20` shows whether the 2,000-item cycle row is faster, and that no move row is slower.

## Boundaries

**Change only:**

- `src/sortable/rect-index.ts`, `src/sortable/linear-shift.ts` and `src/sortable/y.ts`, for the window, the confirmation's slot choice and the development check (`DRD-49` properties 1, 2 and 4);
- the tests for W5 and W6 (property 6);
- [`contract.md`](contract.md) `DRI-14`, its change record and its current-state paragraph, `y()`'s documentation in `src/sortable/y.ts`, and the package README's sortable paragraph (property 5). The contract paragraph is `DRD-49`'s, as written there.

**Do not change:** `xy()` or its full measurement, `linearShift`'s prediction rule, the placeholder's measurement, `operation.ts`, the landing, the keyboard path, the displacement sink, `EQUIVALENCE_SLACK`, any `bench/` file, `judge`, any row, injection, floor entry or ceiling, or any recorded reading.

**Do not run** `--prove`, `--floors` or a campaign. `DRD-45` property 9's repair isn't part of this unit, and a `--before` run applies no injection.

## Items

### 1. The base

Before any change, `git diff --stat 71f20df20 HEAD -- packages/drag/src packages/drag/tests` is empty. Record it in the report.

### 2. The window

`DRD-49` properties 1 to 4. In short:

- the cache knows every slot's element, and holds measured geometry for one contiguous range of slots;
- before the scan, a resolution grows that range from the slots next to the placeholder's gap toward the pointer, until it holds the two slots whose centers bracket the pointer's y, or reaches the list's end on that side;
- the scan runs over the window, with the placeholder as the incumbent and the same tie rule as now;
- a slot is read at most once between two invalidations, and each read is settled through the sink when one is composed;
- `moved`'s crossed slots and probe, and `DRD-47`'s confirmation, use slots in the window. The confirmation reads nothing when the cache is stale or the window is empty;
- the development check compares every slot in the window, and the placeholder, with a fresh measurement;
- `invalidate`, `retire`, a rebase and a changed collection version discard the window.

Where the window's state lives, how the first gap is found when the query holds no insertion, and which window slot the confirmation reads are the unit's choices. State each in the report, with the reason. Keep `xy()`'s code path out of the window's code where the module structure allows it, as `linear-shift.ts`'s header asks.

### 3. The witnesses

Write the tests with the `test-component` skill: real custom elements and real browser input.

| Witness | What it shows | Mutation that must fail it |
| --- | --- | --- |
| **W5** | In `tests/hot-path.browser.test.ts`'s census, the layout reads from the activation through the first frame after it are equal at two item counts at least ten times apart | **M5:** the window replaced by every slot |
| **W6** | Rows of at least two heights. A drag with real input crosses at least 20 rows down and back up, with a frame after each move. After each frame, the placeholder's gap is the gap `y()`'s rule gives against a fresh measurement of every row, computed in the test | **M6:** the window grown one slot short of bracketing the pointer |

Run each mutation on a scratch copy or an uncommitted edit, and keep its output. Report the engine each one ran in. W5 must also fail at `71f20df20`'s source, and W6 must pass there. These must still pass: "should re-measure on scroll during a drag, nested scrollers included", `DRD-47`'s W1 and W2, and every census test, including "should read no layout in a sample, and none in a frame with nothing stale".

### 4. The contract, the terms and the README

Apply `DRD-49` property 5 in the same commit as item 2: the `DRI-14` paragraph as written, a change record row that names `DRD-49`, a sentence in the contract's current-state paragraph, `y()`'s documentation, and the README sentence.

### 5. The confirmation run

From `packages/drag`, at the unit's last code commit, one process after the other:

```sh
node bench/compare.ts --before 71f20df20 --only "activate-and-drop cycles" --out .plan/measurements/2026-11-<day>-window-cycles.json
node bench/compare.ts --before 71f20df20 --only "moves, one frame each" --out .plan/measurements/2026-11-<day>-window-moves.json
```

The first selects the four CDP cycle rows and "in the page: 50 activate-and-drop cycles, 20 items, no landing". The second selects "300 moves, one frame each" at 20 and 2,000 items, their in-page mirrors, and "free drag, 300 moves, one frame each", which is the control. Check each selection in its output before reading any verdict.

- **One browser process per command,** with the unchanged `judge`, rounds and A/A control (`DRD-46` property 8).
- **The hold** of `DRD-44` property 6, once around both processes: ask the owner's sessions to hold before the first browser starts, release them after the second ends, and record both times. Nothing else from this session runs in between.
- **The machine record** of `DRD-40` property 4 with `DRD-44`'s amendment, at the head and the foot of each process.

Read the result by `DRD-49` property 7:

| Result | Condition |
| --- | --- |
| **Confirmed** | "50 activate-and-drop cycles, 2000 items, no landing" is "faster" in `scriptUs`, and nothing is returned |
| **Not confirmed** | That row shows "no difference shown" in `scriptUs`, and no row is slower. Report it, and don't land the change as an optimization. The architect decides what follows |
| **Returned** | Any row is "slower" on any measure, or any row's layout count is above base |

Report every row's verdicts with their sign counts, medians and A/A bounds. Report the landed 2,000-item cycle row and the 2,000-item move rows beside the target.

### 6. The other checks

After both processes, not during them:

- the three-engine suite, with only the known failures;
- the per-sample tests and the census tests;
- the size table, at the unit's last code commit and at `71f20df20`'s source, one after the other. Report each composition's change beside item 5's rows (`DRD-40` property 6). The control is every row without `sortable`, which reads 0. Report "sortable + xy" whatever it reads, with its cause.

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | Empty |
| `git diff --stat <base>..HEAD -- packages/drag` | Only the files under §Boundaries, the report and `measurements/` |
| W5 and W6 | Pass in every engine the suite runs. W5 fails and W6 passes at `71f20df20`'s source |
| M5 and M6 | Each fails its witness |
| Item 5 | Two processes, each exits 0, with every selected row judged |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck |
| Markdown | `handoff.md`'s Markdown checks |

## Report

Write `performance-window-report.md` beside this file. Save each run's JSON and console output under `measurements/`, unedited, with the machine record and the hold's times, and the witness, mutation, suite and size outputs beside them. The report gives the unit's three choices, every check above, item 5's verdict tables, item 6's results, and the result by item 5's table.

## Return to the architect

Stop and return if:

- item 1 isn't empty;
- the development equivalence check throws in any engine. Don't weaken the check;
- an existing test fails, or expects a resolution to measure every row;
- W5 passes under M5, or W6 under M6, in every engine;
- `--before 71f20df20` refuses to run, for example on a stale injection. Don't repair the injections;
- item 5's result is "returned";
- a size row that is green at `71f20df20` turns red. "sortable + y" has 155 B Brotli left, and "sortable + xy" 51 B. Budgets don't move;
- the change needs a file outside §Boundaries.

**Not a return, and reported:** "not confirmed". The change stays on the branch, unlanded as an optimization, until the architect decides.

## After this unit

The architect reads the report and records the result under `DRD-49`. The owner accepts or refuses the bytes. `DRF-21` stays open until the next bytes reading that a report or decision uses, and `DRD-45` property 9 before any `--prove` or `--floors`.