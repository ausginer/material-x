# Performance trace handoff

**For:** one `implementer` unit on `drag/performance-resolution`, in the worktree `.claude/worktrees/drag-performance-resolution`. **Base:** the commit that carries this handoff.

**Governing records:** `DRD-46` in [`00-index.md`](00-index.md), with `DRD-40` properties 4 and 7 and `DRD-45` property 9. [`performance-plan.md`](performance-plan.md) §2 P1c. The stopped check is [`performance-page-check-handoff.md`](performance-page-check-handoff.md), and this unit doesn't run it.

**Goal:** after this unit, the owner and the architect can open a short Chrome trace of each scenario below in DevTools and see where each event's main-thread time goes, with the set-up outside the trace. The report names the optimization candidates the traces show, and the architect selects one from it.

## Boundaries

**Do not change:**

- any tracked file under `src/` or `tests/`, or `bench/lab.ts`, `bench/lab-no-lift.ts` or `bench/lab-drag2.ts`. A lab file is in every arm's bundle;
- any existing row, mode, injection or floor entry of [`compare.ts`](../bench/compare.ts), `judge`, or `openPage`'s page set-up. A helper may be shared with the trace mode, but not changed in behavior;
- any recorded reading under `measurements/`.

**Do not run** any comparison, `--before`, `--prove`, `--floors` or timing campaign. Don't implement, prototype or measure a candidate: the owner asked for no production optimization yet.

**The traced source is `packages/drag/src` at `566ebfc65`,** on `drag/performance`, and not this branch's working tree. The alias cleanup changed `y.ts`, `rect-index.ts`, `operation.ts`, `linear-shift.ts` and `session.ts`, which the move path runs, and a candidate is written against that source. Line numbers in the report are that revision's.

**Machine state:** no hold is required (`DRD-46` property 2). Nothing else from this session runs while a browser records. Each trace's machine record has `DRD-40` property 4's fields with `DRD-44`'s amendment: the commit, the Chrome and Node versions, the CPU count, model and core sets, and the load average before and after.

## Items

### 1. The trace mode

**Required properties:**

- **Reuse.** A mode of `compare.ts` beside `--profile`, which builds and drives the page with `compare.ts`'s own `bundle`, `archivedSource`, `openPage`, `mount`, `grabAndCross`, `movePhase`, `X` and `Y0`. No scenario's set-up, positions or waits are copied. A mode is recommended over a separate script because `compare.ts` runs its main block on import, so a separate script would have to copy these.
- **Source.** The arm is built as `--before` builds its arm: `src` at a revision named on the command line, with this branch's `bench/lab.ts`, `__DEV__` false, unminified.
- **Selection and dry run.** Scenarios are selected by text, as `--only` selects rows. A dry run launches no browser, lists the selected scenarios, and exits 0.
- **Set-up outside the trace.** For each trace: a new page from `openPage`, the scenario's set-up, then a wait until the page is idle, which is at least two animation frames after every landing and row animation has ended. Tracing starts after that. After the interaction it waits in the same way, then stops.
- **Phases and events.** User-timing marks divide each traced interaction into its phases: press, crossing, moves and release with its landing for a move scenario, and each press and release for a press scenario. Each input event can be found in the trace by its input dispatch or by a mark. Any evaluation that makes a mark runs between input commands, never inside an event's handling.
- **Content.** For the page's main thread: tasks, input dispatch, animation frames, JavaScript samples with stacks that name the bundle's functions and lines, style and layout with the stack of the script that forced them, paint, garbage collection and the user-timing marks. The report states the trace categories and the effective sample interval, the median gap between samples in the interaction.
- **Files.** Each trace is one gzip-compressed JSON file in Chrome's trace event format that DevTools' Performance panel opens. The arm's bundle is saved once as text beside the traces, so a sample's line resolves to its module by the bundle's `// <path>` markers.

### 2. The scenarios

Each is a short form of the row it names, with that row's mount options, positions and waits, driven by CDP input as that row is.

| Scenario | Set-up, not traced | Traced interaction | Row it mirrors |
| --- | --- | --- | --- |
| Reordering moves, 20 items | The row's mount | `grabAndCross`, then `movePhase(i)` for i = 0 to 60 with one frame each, then the release and its landing | "300 moves, one frame each, 20 items" and its in-page mirror |
| Reordering moves, 2,000 items | The same, 2,000 items | The same | "300 moves, one frame each, 2000 items" and its in-page mirror |
| Press and release, 2,000 items, `[...root.children]` | The row's mount, the move to (`X`, `Y0`), 30 ms | 10 press-and-release pairs | "press and release below the threshold, 2000 items, [...root.children]" |
| Press and release, 2,000 items, cached array | The same, with the cached array | The same | "… 2000 items, cached array" |
| Press and release, 20 items, cached array | The same, 20 items | The same | "… 20 items, cached array" |

The move positions are one jump of 360 px down at i = 0, then 60 moves of 6 px back to `Y0 + 20`, which cross 9 row boundaries.

**Per scenario:** three warm traces and one cold trace, each in its own page. A warm trace's set-up ends with one untraced pass of the same interaction in that page. A cold trace records the page's first interaction. That makes 20 traces.

### 3. Attribution

From the traces, with no browser. Give each figure as the median of the three warm traces with their range, and the cold trace's figure beside it.

- **Per phase and per event:** main-thread time split into the library's (`src/` modules in the bundle), the consumer's (`bench/lab.ts`), the harness's (mark evaluations and other CDP-driven work), and the browser's (input dispatch, style, layout, paint, garbage collection, the rest).
- **The library's top functions** by self time per event, with module, lines at `566ebfc65` and sample count.
- **Every forced style or layout** in the interaction, with the function that forced it and its count per event.
- **Moves:** which moves reordered, read from the trace, and the cost of a reordering move against a move that doesn't reorder.
- **Presses:** the press against the release, and the consumer's `items()` against the library's own work at the press.

Where a figure rests on fewer than 20 samples, say so.

### 4. Candidates

`DRD-46` property 7 lists what each candidate states. Rank them by expected saving per interaction. A cost the library can't change is listed apart, and isn't a candidate. A candidate that moves `DRO-1`'s pull at a press, an ownership decision or a contract invariant is marked as a decision first.

## Verification

| Check | Required result |
| --- | --- |
| `git diff --stat <this handoff's commit>..HEAD -- src tests bench/lab.ts bench/lab-no-lift.ts bench/lab-drag2.ts`, in `packages/drag` | Empty |
| `--prove --dry` and `--floors --dry`, before and after the change | The same applied counts, printed both times |
| The trace mode's dry run, with `CHROME_EXECUTABLE=/nonexistent/chrome` | The five scenarios, exit 0 |
| Each trace file, read by a script | Parses, has the phase marks and samples on the page's main thread |
| One trace per scenario in DevTools' Performance panel | Opens. If the unit can't open DevTools, say so, and the owner checks |
| `compare.ts` | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck |
| Markdown | `handoff.md`'s Markdown checks |

## Report

Write `performance-trace-report.md` beside this file. Put the traces and the bundle under `measurements/traces/2026-11-<day>/`, and the analysis script as `.ts.txt` with its output under `measurements/`, unedited. Keep a discarded trace, with its reason. The report gives the trace mode's command line, the machine records, items 3 and 4, and every check above.

## Return to the architect

Stop and return if:

- a move scenario's traced pass doesn't add exactly one entry to `lab.log`, or reorders nothing;
- a press scenario's pairs change the items' order;
- a page error appears while a trace records;
- `566ebfc65`'s `src` doesn't build with this branch's `bench/lab.ts`;
- the trace mode needs a change that this handoff's boundaries exclude;
- the traces to commit exceed 30 MB in total. Return before committing them.

**Not a return, and reported:** a scenario whose trace shows no library cost worth a candidate.

## After this unit

The architect selects one candidate, or none, and records the selection with its confirming rows (`DRD-46` property 8). The candidate's unit needs `566ebfc65`'s source and this branch's record on one branch. `drag/performance` and `drag/performance-resolution` diverged at `39c8b432c`, and the owner decides how they join.