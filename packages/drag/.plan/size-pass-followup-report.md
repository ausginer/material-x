# Size pass follow-up report

**Input:** [`size-pass-followup-handoff.md`](size-pass-followup-handoff.md), carried by `d5ab84a83` on `drag/size`. **Governing records:** `DRD-51` in [`00-index.md`](00-index.md) (§First unit item 2 as amended, and properties 1 to 4 with property 3 as amended), [`size-pass-unit-assessment.md`](size-pass-unit-assessment.md) §3 and §4, and [`performance-plan.md`](performance-plan.md) §3. **Base for comparison:** `d5ab84a83`, whose `packages/drag/src`, `tests`, `bench` and `tsconfig.json` are `ed4bd589f`'s.

**Outcome: complete, and no return condition was met.** `freeDrag`'s `invalidate` step is a function of `free-drag/behavior.ts`'s module, and `FreeDragBehavior` has no `invalidate` member. Lint is clean on both files, `class-methods-use-this` included. Size equals the architect's reading on every row: −1 B Brotli on "freeDrag", −5 B on "freeDrag + bounds + landing", and 0/0/0 on the eight control rows. The witness passes in three engines and fails under M2. The probe README gives one launch per probe test and the runner sequence for the four. Each documented launch printed one probe line with functions under `sortable/`, and both move lines counted `moves=200`. No budget moved, and no deferred campaign ran.

| Commit | Content |
| --- | --- |
| `e22db849c` | Item 2: R1, the `invalidate` step as an exported function of `free-drag/behavior.ts`. **The unit's only source commit** |
| `0c13786ea` | Item 3: the probe README's launch section and file table, the two probe headers, and `warm-move-probe.test.ts.txt` |
| the commit carrying this report | This report, and the records under `measurements/` |

Size readings were taken in detached worktrees of `d5ab84a83` and `e22db849c` in this session's scratch directory, whose `node_modules` were symbolic links to the main checkout's. Item 3's check ran in a detached worktree of `0c13786ea`. The witness, M2, `measure.ts` and the suites ran in the main checkout.

## Item 1: the base

`git diff --stat ed4bd589f HEAD -- packages/drag/src packages/drag/tests packages/drag/bench packages/drag/tsconfig.json` at `d5ab84a83`, before any change: **empty** (exit 0, no output).

## Item 2: the `invalidate` step, `e22db849c`

[`R1-invalidate-step-as-behavior-module-function.diff.txt`](probes/size-pass/patches/R1-invalidate-step-as-behavior-module-function.diff.txt) applied with `git apply` from the repository root, unchanged. `fmt`, `lint-fix` and `fmt` changed nothing in it.

**The properties, read in the diff:**

1. **`FreeDragBehavior` has no `invalidate` member.** The arrow property and its comment are removed from the class.
2. **The step is a module function**, `export function invalidate(operation: FreeDragOperation | null): void`, in `src/free-drag/behavior.ts`. Its body is `operation?.handleEvent();`, and it reads nothing else.
3. **The controller passes that same function on every call:** `invalidate: () => kernel.requestStep(invalidate)`, with `invalidate` imported from `./free-drag/behavior.ts`. No function is created per call.
4. **The comment moved with it.** Its first sentence names the step as "The controller's `invalidate` step", and the rest is unchanged: it calls the operation's `handleEvent`, so its bounds and drop targets are re-read at their next read, and with no operation nothing is stale, because each activation marks the bounds stale before its first read.
5. **The type and the published declarations don't change.** `FreeDragController` isn't in the diff. The build at both trees (`npx tsdown --config tsdown.config.ts`) emits the same 27 `.d.ts` files, each byte-identical under `cmp` ([record](measurements/2026-11-12-followup-declarations.txt)). The emitted `free-drag/behavior.d.ts` carries only `FreeDragConfig`, so the new export doesn't reach it. `free-drag/behavior.js` isn't in `package.json`'s exports map.

**The witness,** `tests/free-drag.browser.test.ts` › "should re-read bounds on invalidate", in `vitest.engines.config.ts`: passes in Chromium, Firefox and WebKit ([output](measurements/2026-11-12-followup-witness.txt)).

**M2:** line 50 of `src/free-drag/behavior.ts`, `operation?.handleEvent();`, replaced with `void operation;`. The witness in Chromium **fails**: "expected 300 to be close to 200, received difference is 100, but expected 0.5", the same failure as in the architect's worktree. The file was then restored from the copy saved before the mutation, and `cmp` reports it identical ([output](measurements/2026-11-12-followup-m2.txt)). M2 ran before the commit, on the patched file.

**Size,** `size.ts.txt` with `DRD-51` property 1's settings, `e22db849c` against `d5ab84a83` ([table](measurements/2026-11-12-followup-commit1-sizes.txt), [base JSON](measurements/2026-11-12-followup-base-size.json), [commit JSON](measurements/2026-11-12-followup-commit1-size.json)):

| Row                         | Expected  | Read      |
| --------------------------- | --------- | --------- |
| draggable alone             | 0/0/0     | 0/0/0     |
| draggable + lift            | 0/0/0     | 0/0/0     |
| example: resize handle      | 0/0/0     | 0/0/0     |
| example: drop zone          | 0/0/0     | 0/0/0     |
| example: canvas group       | 0/0/0     | 0/0/0     |
| freeDrag                    | −13/−7/−1 | −13/−7/−1 |
| freeDrag + bounds + landing | −13/−5/−5 | −13/−5/−5 |
| sortable + y                | 0/0/0     | 0/0/0     |
| sortable + xy               | 0/0/0     | 0/0/0     |
| complete                    | 0/0/0     | 0/0/0     |

Minified/gzip-9/Brotli-11 bytes. The two `freeDrag` rows equal the expected figures, and the eight control rows read 0/0/0.

**`bench/size/measure.ts`** at `e22db849c` ([output](measurements/2026-11-12-followup-measure.txt)): "freeDrag" reads 5,022 B Brotli against 5,023 at `ed4bd589f`, and "freeDrag + bounds + landing" 5,454 against 5,459. Both stay over their ceilings, by 55 and 244 B. The other four violations read as at the base: "draggable alone" +57 with its control +172, "example: resize handle" +8, "example: drop zone" +172 and "complete" +219. The rows that were green stay green with the same readings: "draggable + lift" 3,963, "example: canvas group" 3,302, "sortable + y" 6,652 and "sortable + xy" 6,541. `measure.ts` exits 1, as at the base.

**Format, lint and typecheck** on the two files: `npx just lint` reports no error, `class-methods-use-this` included, and `npx just typecheck` reports none ([lint](measurements/2026-11-12-followup-commit1-lint.txt), [typecheck](measurements/2026-11-12-followup-commit1-typecheck.txt)). This closes the lint finding of [`size-pass-unit-report.md`](size-pass-unit-report.md).

## Item 3: the probe's launch documentation, `0c13786ea`

Under [`probes/rect-index-ownership/`](probes/rect-index-ownership/):

- **[`README.md`](probes/rect-index-ownership/README.md)** has a new last section, "Launching the allocation probes". It gives one whole command per probe test, each with `--silent=false` and run from a scratch worktree's `packages/drag`, with the patterns `'C6 probe y:'`, `'C6 probe xy:'`, `'C6 move probe'` and `'C6 warm move probe'`. It says why: in one launch that ran `y()` and then `xy()`, every `xy()` line read `perMove=0.00 keys={}` at both trees, while `xy()` alone reads about 50 B per sample, and the cause isn't established. It cites the unit's allocation record and the assessment's §4. It says that a line reading 0 B with no function under `sortable/` isn't a reading: its launch is discarded, kept with the reason, and repeated alone. It shows the four launches as one `node bench/campaign.ts run`, one command per step, and says to wait through the runner. The file table lists the warm move probe. The "How the readings were made" bullet no longer gives the `-t '<name>'` form, and points to the new section.
- **`warm-move-probe.test.ts.txt`** is new. Its body is the warm probe as the first unit ran it, copied from that unit's scratch test file. It differs from `move-probe.test.ts.txt` in exactly four places: `describe` and test titles "C6 warm move probe", `cross(2000)` before the 200 sampled crossings, the line tag `C6-WARM-MOVE-PROBE`, and the timeout 900,000 ms. Its header says that `DRD-52` property 9's result is read with it.
- **`alloc-probe.test.ts.txt`'s header** no longer names `-t 'C6 probe'`. It gives `-t 'C6 probe y:'` or `-t 'C6 probe xy:'`, one axis per launch, and says why.
- **`move-probe.test.ts.txt`'s header** gives `-t 'C6 move probe'` and says that it matches no other probe. `C6 warm move probe` doesn't contain that text.

The probes' bodies are unchanged.

**The check of the documented commands.** In a detached worktree of `0c13786ea`, the three probe files were appended to the scratch worktree's `tests/hot-path.browser.test.ts`, and the README's `campaign.ts run` command ran from its `packages/drag`, verbatim ([status](measurements/2026-11-12-followup-c6-probes/status.json), [logs](measurements/2026-11-12-followup-c6-probes/)):

| Step | Pattern | Exit | Probe lines | Line |
| --- | --- | --: | --: | --- |
| 1 | `'C6 probe y:'` | 0 | 1 | `C6-PROBE y perMove=86.58`: `y.ts:resolve` 9,324, `linear-shift.ts:refresh` 5,280, `operation.ts:move` 20,028 |
| 2 | `'C6 probe xy:'` | 0 | 1 | `C6-PROBE xy perMove=50.13`: `operation.ts:move` 20,052 |
| 3 | `'C6 move probe'` | 0 | 1 | `C6-MOVE-PROBE moves=200 perMove=133.52`: `linear-shift.ts` `refresh` 5,028, `moved` 1,368 and `advance` 11,844; `rect-index.ts` `measurePlaceholder` 3,344 and `pack` 5,120 |
| 4 | `'C6 warm move probe'` | 0 | 1 | `C6-WARM-MOVE-PROBE moves=200 perMove=16.72`: `linear-shift.ts:refresh` 3,344 |

Bytes are heap-sampled bytes per function, every one under `sortable/`. Each launch ran 1 test and skipped the other 12, and both move lines count `moves=200`. The runner ran from 14:28:05 to 14:30:41 UTC and recorded every step as succeeded. Its status records the revision as `0c13786ea`, dirty, because of the appended test file. For orientation only, the first unit's readings at `237d65d2f`, whose `src` this commit's matches under `sortable/`, were 86.31 B for `y()`, 50.15 B for `xy()` alone, 128.77 B per committed move cold and 17.00 B warm ([report](size-pass-unit-report.md)).

These figures are observations, not a comparison, and nothing gates them.

## Verification

The suites ran at `0c13786ea` in the main checkout as one runner sequence, `node bench/campaign.ts run --id followup-suites`: the hot path, then the three engines, then the Chromium suite. That order puts the known failures last ([status and logs](measurements/2026-11-12-followup-suites/)). The runner recorded the revision as dirty because this report and the measurement files were present and untracked. `src` and `tests` were as committed.

| Check | Required result | Result |
| --- | --- | --- |
| Item 1 | Empty | Empty |
| `git diff --stat d5ab84a83..HEAD -- packages/drag` | Only §Boundaries' files, the report and `measurements/` | `src/free-drag.ts`, `src/free-drag/behavior.ts`, the probe `README.md`, the two probe headers and `warm-move-probe.test.ts.txt`, plus this report and `measurements/` in its own commit |
| Item 2's properties | Each holds, read in the diff | Each holds (§Item 2) |
| The witness | Passes in Chromium, Firefox and WebKit | Passes in all three |
| M2 | The witness fails | Fails: "expected 300 to be close to 200" |
| Item 2's size | Control rows 0/0/0; the two `freeDrag` rows as expected | As expected on all ten rows |
| The Chromium suite | Only the six known size rows fail | 30 files, 414 passed, 6 failed. The six are `tests/size.node.test.ts`'s rows "draggable alone", "example: resize handle", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete" (step 3, exit 1) |
| Three engines (`npx just test-engines`) | No failure | 72 files, 1,071 passed, 18 skipped (step 2, exit 0) |
| `tests/hot-path.browser.test.ts`, `shipped` project | Every test passes | 9 of 9 (step 1, exit 0) |
| Item 3's launches | One probe line each, with functions under `sortable/`; `moves=200` on the move lines | As required, in all four |
| Changed `.ts` files | Format, lint, typecheck; no lint error on the two files | Clean |
| Markdown | `handoff.md`'s Markdown checks | `npx just fmt` on the README and this report; every relative link target and the README's new anchor exist; `git diff --check` clean |

**Return conditions:** none was met. Item 1 was empty. Every control row read 0/0/0, and both `freeDrag` rows equal the expected figures. The witness passes with the change and fails under M2. No green row turned red: "draggable + lift", "example: canvas group", "sortable + y" and "sortable + xy" read as at the base. Every documented launch printed a probe line with functions under `sortable/`, and no file outside §Boundaries changed.

## Limits

- No `compare.ts` row ran. Item 2 only removes work, and the handoff forbids it (`DRD-51` property 4).
- `--prove`, `--floors`, the page check, B3' and the in-page floors didn't run (`DRD-51` property 3). No budget, ceiling, control figure, row, injection or floor entry changed.
- Why the second probe in one launch reads an empty profile wasn't investigated. The assessment's §4 doesn't require it.
- Markdown has no configured linter, so lint didn't apply to it. Its links were checked by a scratch script that tests each relative target exists.

## Next

The architect reads this report and records the result under `DRD-51`. The owner decides `DRO-14` items 3 and 4, and the re-base under `DRO-4` after the pass.