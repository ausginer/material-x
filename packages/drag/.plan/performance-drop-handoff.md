# Performance drop handoff

**Done.** The unit landed at `bf9d1caed` and `8eda874f0` on `drag/performance`, after `093f31c7f` joined the branches. [`performance-drop-report.md`](performance-drop-report.md) records it, and [`performance-drop-assessment.md`](performance-drop-assessment.md) reads it: confirmed.

**For:** one `implementer` unit. **Base:** a commit, on one branch, that holds both `packages/drag/src` at `566ebfc65` and this handoff. `drag/performance` and `drag/performance-resolution` diverged at `39c8b432c`, and the owner decides how they join ([trace handoff](performance-trace-handoff.md) §After this unit). The unit starts after the owner names that branch.

**Governing records:** `DRD-47` in [`00-index.md`](00-index.md), with `DRD-46` property 8, `DRD-40` properties 4, 6 and 7, `DRD-44` property 6 and `DRD-45` property 9. [`performance-plan.md`](performance-plan.md) §2 P3. The reasons are in [`performance-trace-assessment.md`](performance-trace-assessment.md) §2 and §3.

**Goal:** after this unit, a pointer drop with a warm axis cache reads one row instead of every row, and still lands where a full measurement at the release would land after any scroll. A paired run against `566ebfc65` shows whether the 2,000-item cycle row is faster.

## Boundaries

**Change only:**

- `src/sortable/operation.ts`'s pointer drop, `src/sortable/axis.ts`'s `InsertionGeometry`, `src/sortable/y.ts`, `src/sortable/xy.ts`, and the shared definition the confirmation needs, in `src/sortable/rect-index.ts` or beside it (`DRD-47` properties 1 and 2);
- the tests for W1 and W2 (`DRD-47` property 6);
- [`contract.md`](contract.md) `DRI-14` and its change record, and the package README's sortable paragraph (`DRD-47` property 5). The contract paragraph is `DRD-47`'s text, as written there.

**Do not change:** the frame path, `moved`, `rebase`, activation, the command drop, the landing, the displacement sink, `EQUIVALENCE_SLACK` or the development check, any `bench/` file, `judge`, any row, injection or floor entry, or any recorded reading.

**Do not run** `--prove`, `--floors` or a campaign. `DRD-45` property 9's repair isn't part of this unit, and a `--before` run applies no injection.

## Items

### 1. The base

Before any change, `git diff --stat 566ebfc65 HEAD -- packages/drag/src` is empty. Record it in the report.

### 2. The confirmation

`DRD-47` properties 1 to 4. In short:

- the pointer drop calls the confirmation where it called `axis.invalidate()`;
- a stale cache reads nothing more;
- a warm cache measures one cached slot's element again, through `box` when configured, settles it through the displacement sink when composed, and compares its left and top with the cached slot within `EQUIVALENCE_SLACK`;
- a difference calls the axis's own `invalidate()`, and the resolution then measures every slot;
- `y()` and `xy()` share one definition of that read and comparison.

Which slot to read is the unit's choice. State it, and why, in the report.

### 3. The witnesses

Write the tests with the `test-component` skill: real custom elements and real browser input.

| Witness | What it shows | Mutation that must fail it |
| --- | --- | --- |
| **W1** | A sortable in a scrolling container. A drag commits at least one move and waits a frame. A capture-phase `pointerup` listener on the window, added before the press, scrolls the container by more than half a row. The reorder is the one under the release position after that scroll | **M1:** the call deleted, with no confirmation |
| **W2** | In `tests/hot-path.browser.test.ts`'s census, the `getBoundingClientRect` calls during a pointer drop with a warm cache and no landing are the same at two item counts at least ten times apart | **M2:** the unconditional `axis.invalidate()` restored |

Run each mutation on a scratch copy or an uncommitted edit, and keep its output. Report the engine each one ran in. W1 must also pass at `566ebfc65`'s source, which has the unconditional call. The existing test "should re-measure on scroll during a drag, nested scrollers included" still passes.

### 4. The contract and the README

Apply `DRD-47` property 5 in the same commit as item 2: the `DRI-14` paragraph as written, a change record row that names `DRD-47`, and the README sentence.

### 5. The confirmation run

From `packages/drag`, at the unit's last code commit:

```sh
node bench/compare.ts --before 566ebfc65 --only "activate-and-drop cycles" --out .plan/measurements/2026-11-<day>-drop-cycles.json
```

That selects the four CDP cycle rows and "in the page: 50 activate-and-drop cycles, 20 items, no landing". Check the selection in the run's output before reading any verdict.

- **One browser process,** with the unchanged `judge`, rounds and A/A control (`DRD-46` property 8).
- **The hold** of `DRD-44` property 6: ask the owner's sessions to hold before the browser starts, release them after it ends, and record both times. Nothing else from this session runs during the process.
- **The machine record** of `DRD-40` property 4 with `DRD-44`'s amendment, at the head and the foot.

Read the result by `DRD-47` property 7:

| Result | Condition |
| --- | --- |
| **Confirmed** | "50 activate-and-drop cycles, 2000 items, no landing" is "faster" in `scriptUs` |
| **Not confirmed** | That row shows "no difference shown" in `scriptUs`, and no row is slower. Report it, and don't land the change as an optimization. The architect decides what follows |
| **Returned** | Any row is "slower" on any measure, or any row's layout count is above base |

Report every row's verdicts with their sign counts, medians and A/A bounds. Report the landed 2,000-item row beside the target.

### 6. The other checks

After the confirmation run, not during it:

- the three-engine suite, with only the known failures;
- the per-sample tests and the census tests;
- the size table, with the change's bytes per composition. Report them beside item 5's rows (`DRD-40` property 6).

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | Empty |
| `git diff --stat <base>..HEAD -- packages/drag` | Only the files under §Boundaries, the report and `measurements/` |
| W1 and W2 | Pass in every engine the suite runs |
| M1 and M2 | Each fails its witness |
| Item 5 | One process exits 0, with the five rows judged |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck |
| Markdown | `handoff.md`'s Markdown checks |

## Report

Write `performance-drop-report.md` beside this file. Save the run's JSON and its console output under `measurements/`, unedited, with the machine record and the hold's times, and the mutation outputs beside them. The report gives the slot choice, every check above, item 5's verdict table, item 6's results, and the result by item 5's table.

## Return to the architect

Stop and return if:

- item 1 isn't empty;
- the development equivalence check throws at a drop in any engine. Don't change the check;
- an existing test expects the drop to measure every row;
- W1 passes under M1, or W2 passes under M2, in every engine;
- `--before 566ebfc65` refuses to run, for example on a stale injection. Don't repair the injections;
- item 5's result is "returned";
- the change needs a file outside §Boundaries.

**Not a return, and reported:** "not confirmed". The change stays on the branch, unlanded as an optimization, until the architect decides.

## After this unit

The architect reads the report and records the result under `DRD-47`. `DRF-21` is repaired before the next bytes reading that a report or decision uses, and `DRF-22` waits for this report.