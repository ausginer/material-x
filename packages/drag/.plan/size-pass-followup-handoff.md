# Size pass follow-up handoff

**For:** one `implementer` unit on `drag/size`. **Base:** the commit that carries this handoff. Its `packages/drag/src`, `tests`, `bench` and `tsconfig.json` are `ed4bd589f`'s, and `src` is `237d65d2f`'s, P4's first unit.

**Governing records:**

- `DRD-51` in [`00-index.md`](00-index.md): the amendment of §First unit item 2, and properties 1 to 4 with property 3 as amended;
- [`size-pass-unit-assessment.md`](size-pass-unit-assessment.md) §3 and §4, which give the reasons;
- [`performance-plan.md`](performance-plan.md) §3, on sequencing runs and waiting for them.

**Goal:** after this unit, `freeDrag`'s `invalidate` step is one module function that every controller requests, and `FreeDragBehavior` has no member that reads no state. The C6 probe's documentation says how to launch each reading so that it reads what it measures. Budgets don't move.

## Boundaries

**Change only:**

- **Item 2:** `src/free-drag.ts` and `src/free-drag/behavior.ts`.
- **Item 3,** under `.plan/probes/rect-index-ownership/`:
  - `README.md`;
  - the header comments of `alloc-probe.test.ts.txt` and `move-probe.test.ts.txt`;
  - a new `warm-move-probe.test.ts.txt`.
- **Records:** the report, and `measurements/` files.

**Do not change:**

- any test. The witness for item 2 exists;
- any other source, `bench/` file, row, injection, floor entry, ceiling or control figure;
- any recorded reading, and any other `.plan/` file. The probe patches under `patches/` stay as measured;
- the probes' bodies. Item 3 changes their documentation only.

**Do not run** `compare.ts`, `--prove`, `--floors`, the page check, B3' or the in-page floors. Item 2 only removes work (`DRD-51` property 4), and the deferred campaigns stay stopped (property 3).

**Sequencing.** Run any sequence of long processes through `node bench/campaign.ts run`, and wait for it through the runner, a foreground command, or the harness's notice that a background command exited. **Don't wait by searching the process table:** `pgrep -f <pattern>` finds the waiting shell itself, so the wait never ends (`performance-plan.md` §3).

## Items

### 1. The base

Before any change, record in the report that this command prints nothing:

```sh
git diff --stat ed4bd589f HEAD -- packages/drag/src packages/drag/tests packages/drag/bench packages/drag/tsconfig.json
```

The suite's known failures at the base are the six rows over their ceilings:

| Row | Brotli at `ed4bd589f` | Ceiling | Over |
| --- | --: | --: | --: |
| draggable alone | 2,196 | 2,139 | +57, and its control 2,024 moved +172 |
| example: resize handle | 3,321 | 3,313 | +8 |
| example: drop zone | 4,603 | 4,431 | +172 |
| freeDrag | 5,023 | 4,967 | +56 |
| freeDrag + bounds + landing | 5,459 | 5,210 | +249 |
| complete | 7,284 | 7,065 | +219 |

### 2. The `invalidate` step, first commit

**Required properties** (`DRD-51` §First unit item 2, as amended):

1. `FreeDragBehavior` has no `invalidate` member.
2. The step is a function of `src/free-drag/behavior.ts`'s module, exported for `free-drag.ts`. It calls `operation?.handleEvent()` and reads nothing else.
3. `freeDrag`'s controller passes that same function to `kernel.requestStep` on every `invalidate()` call. It creates no function per call.
4. The step's comment moves with it and says that it is the controller's `invalidate` step. The comment's other sentences are unchanged.
5. `FreeDragController`'s type and the published `.d.ts` don't change. `free-drag/behavior.js` isn't in the package's exports map.

[`R1-invalidate-step-as-behavior-module-function.diff.txt`](probes/size-pass/patches/R1-invalidate-step-as-behavior-module-function.diff.txt) is the decided form, against `ed4bd589f`. It applies with `git apply` from the repository root. Its typecheck and lint were clean in the architect's worktree.

**The witness:** `tests/free-drag.browser.test.ts` › "should re-read bounds on invalidate". **M2:** replace the step's body with one that doesn't call `handleEvent`, run the witness in Chromium, then restore the file and confirm the restore with `cmp`. The witness must fail. In the architect's worktree, M2 failed with "expected 300 to be close to 200".

**Size,** with `DRD-51` property 1's settings through [`size.ts.txt`](probes/size-pass/size.ts.txt), at this commit against the base, and also `bench/size/measure.ts`. **The control rows,** which don't import `free-drag.ts`: "draggable alone", "draggable + lift", the three examples, "sortable + y", "sortable + xy" and "complete". Expected, from the [architect's readings](measurements/2026-11-12-invalidate-step-readings.txt):

| Row                         | Minified/gzip-9/Brotli-11 |
| --------------------------- | ------------------------- |
| The eight control rows      | 0/0/0                     |
| freeDrag                    | −13/−7/−1                 |
| freeDrag + bounds + landing | −13/−5/−5                 |

### 3. The probe's launch documentation, second commit

[`probes/rect-index-ownership/README.md`](probes/rect-index-ownership/README.md) and the probes' header comments must state:

1. **One probe test per launch.** Each launch's `-t` pattern matches exactly one test: `'C6 probe y:'`, `'C6 probe xy:'`, `'C6 move probe'` or `'C6 warm move probe'`. The README gives the whole command for each, with `--silent=false`, from `packages/drag` of a scratch worktree.
2. **Why.** In one launch that ran `C6 probe y:` and then `C6 probe xy:`, every `xy()` line read `perMove=0.00 keys={}` at both trees, and `xy()` launched alone reads about 50 B per sample. The cause isn't established. Cite [the unit's record](measurements/2026-11-12-size-unit-alloc.txt) and [`size-pass-unit-assessment.md`](size-pass-unit-assessment.md) §4.
3. **A line that reads 0 B with no function under `sortable/` isn't a reading.** Its launch is discarded, kept in the record with the reason, and repeated alone.
4. **The warm move probe is a file of its own,** `warm-move-probe.test.ts.txt`: the move probe as P4's first unit ran it, with `cross(2000)` before the 200 sampled crossings, the test's timeout at 900,000 ms, its `describe` and test titles naming it "C6 warm move probe", and its line tagged `C6-WARM-MOVE-PROBE`. `DRD-52` property 9's result is read with it. The README's file table lists it.
5. **A sequence of launches runs through `bench/campaign.ts run`,** one command per step, and the README shows it for the four launches.
6. `alloc-probe.test.ts.txt`'s header no longer says to run it with `-t 'C6 probe'`, and `move-probe.test.ts.txt`'s header doesn't name a pattern that matches another probe.

**Check the documented commands once.** At this commit, in a scratch worktree, append the three probe files to a scratch copy of `tests/hot-path.browser.test.ts`, and run the four documented launches as one `campaign.ts run`. Each must print exactly one probe line with a function under `sortable/`, and every move line must count `moves=200`. Save the runner's `status.json` and the four logs. **These figures are observations, not a comparison,** and nothing gates them.

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | Empty |
| `git diff --stat <base>..HEAD -- packages/drag` | Only the files under §Boundaries, the report and `measurements/` |
| Item 2's properties | Each holds, read in the diff |
| The witness | Passes in Chromium, Firefox and WebKit |
| M2 | The witness fails |
| Item 2's size | The control rows read 0/0/0, and the two `freeDrag` rows equal the expected figures |
| The Chromium suite (`npx vitest run -c vitest.config.ts`) | Only the six known size rows fail |
| Three engines (`npx just test-engines`) | No failure |
| `tests/hot-path.browser.test.ts` in the `shipped` project | Every test passes |
| Item 3's launches | One probe line each, with a function under `sortable/`, and `moves=200` on the move lines |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck. No lint error survives on the two files, `class-methods-use-this` included |
| Markdown | `handoff.md`'s Markdown checks |

## Report

Write `size-pass-followup-report.md` beside this file. Save under `measurements/`, unedited: the size tables and JSON, `measure.ts`'s output, the witness, M2 and suite outputs, and item 3's runner status and logs.

The report gives each commit and what it carries, every check above, and item 2's size table against the expected one.

## Return to the architect

Stop and return if:

- item 1 isn't empty;
- a control row isn't 0/0/0, or either `freeDrag` row differs from its expected figure;
- the witness fails with the change, or passes under M2;
- a row that is green at the base turns red. "draggable + lift" has 206 B Brotli left, "example: canvas group" 12 B, "sortable + y" 81 B and "sortable + xy" 76 B. Budgets don't move;
- a documented launch in item 3 prints no probe line, or one with no function under `sortable/`;
- the change needs a file outside §Boundaries.

## After this unit

The architect reads the report and records the result under `DRD-51`. The owner decides `DRO-14` items 3 and 4, and the re-base under `DRO-4` after the pass.