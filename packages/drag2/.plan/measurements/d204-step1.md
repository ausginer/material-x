# D-204 step 1 — the runner and construction

**Canonical entry: `drag2:D-204`**, which carries D-203 in full and adds property 12. This record holds step 1's implementation status, its composition figures and its verification. It is **not** the decision's measurement record: `d204-requests.md` is written at step 6, collects every step's figures, and its absence is the witness in 00-index §Decisions not yet implemented.

**Input.** `582092c1f`, the commission's base, with the owner's uncommitted edits to `src/kernel/execution.ts` (a comment and a lint suppression at the post-admission latch read) and `tests/kernel/seams.node.test.ts` (one assertion spelling). `b36088c7e` (D-204) landed on the branch during the step and changed no file under `src/`, so the input's `src/` is the same at both commits. The `execution.ts` edit is absorbed: step 1 deletes the statement it annotated, as the decision record states (`request-application-claude.md` §6). The `seams.node.test.ts` edit is left uncommitted and unchanged.

## What landed

| Item | Where |
| --- | --- |
| The lifecycle request, `LIVE` / `REQUESTED` / `CLOSED`; `requestClose()`, applied at once with no unit running and at the end of the running unit otherwise; `#step` stops at anything but `LIVE`; `closed` reports `CLOSED` only | `src/kernel/execution.ts` |
| Units do not nest, so the transaction depth and the admission flag become one `#running` boolean. A dispatch made while a unit runs appends and returns | `src/kernel/execution.ts` |
| Native ingress refused while any unit runs or once closed (`idle`), before `beginPass`; the pointer listener's click disarm sits behind the same refusal | `execution.ts` `runIngress`, `kernel.ts` `#onPointerDown` |
| The post-admission drain is unconditional | `execution.ts` `runIngress` |
| Panic is the one immediate application: the bracket closes, calls the kernel's panic (which now only reports), then tears down | `execution.ts` `#drain`, `kernel.ts` `#panic` |
| Construction is one unit spanning `draggable()`: `Kernel.construct(factory)` runs the factory and arming inside `ExecutionBracket.construct`, drains after, applies a request before returning, and clears the queue on a throw. `arm()` becomes private `#arm()`, and its three latch tests and the destroyed-in-window exit are deleted | `kernel.ts`, `src/kernel.ts` |
| D-204 property 12: armed `dispatch` keeps its intake check and report; a construction-window dispatch is queued unchecked; nothing is checked at application | `kernel.ts` `dispatch` |
| Contract text: 05 I-1 and I-6 (runner half); 01 §`draggable()` and the two-phase handshake, §`BehaviorContext` (`dispatch`, the window paragraph), §When construction itself fails, §Teardown across two owners; `BehaviorContext.dispatch`, `closed` and `destroy` in `src/kernel/spec.ts`; both controllers' `destroy()` documentation | `.plan/contract/`, `src/` |
| COVERAGE: every row whose cited test changed is restated against the new property; the bracket and construction registers are rewritten, with a D-203 re-read table of the mutations below | `tests/COVERAGE.md` |

`closed` stays readable, as step 1 requires, and reports `CLOSED` only. **A consequence the step makes true early:** every behavior and kernel reading of `closed` inside a unit now reads `false`, so a destroy requested inside a unit no longer stops that unit. 22 browser rows asserted the D-36 outcome — no `onStart`, no terminal, no later slot after a same-unit `destroy()`, rollback of a preparation whose `prepare` destroyed. They are revised to D-203's outcome: the requesting unit completes as it would without the request, then application. Where a row had no fixed expected list, the new expectation was checked against the same row without the request (the `xy()` traversal, `[0, 1, 2, 3]` both ways). `rollback`, `#preparationValid`, `#runAdmission`'s recheck and the behaviors' `closed` reads are still present and unreachable through a destroy; they go at steps 3 and 4.

## Cases

| Case | Rows |
| --- | --- |
| R1, construction and drain half | `execution.node` — _should drain after admission and handle nothing once admission requested destruction_; through the sortable, `features.browser` — the three handle-resolver rows (visual still resolved, nothing admitted after application, next press refused) |
| R9 | `execution.node` — four refusal rows and `idle`; `kernel.browser` — _should refuse a press dispatched from inside a running unit_, _should keep the click suppressor armed through a refused press_ (G3) |
| R10 | `execution.node` — _should apply a destruction requested with no unit running before it returns_, _should have settled its promise when a request with no unit running returns_ |
| R11 | `construction.node` — the five frame-part and factory-body rows |
| R13 | `execution.node` — _should return one promise from every request_, _should settle its one promise once_ |
| R15 | `construction.node` — §ingress attachment during construction, three rows |
| R17, R23 | `construction.node` — _should apply window actions after publication and before draggable() returns, in dispatch order_ |
| R24 | `construction.node` — the two overtaken-window rows |
| R25, R26 | `kernel.browser` — §armed dispatch tags, ten rows |
| R27 | `construction.node` — _should be read only by static validation and armed intake_ |

No row dispatches an out-of-range tag during construction (D-204 property 12).

**Mutations.** Thirteen mutations of `execution.ts` and four of `kernel.ts` — the pointer listener's guard, the window drop, and both unwind guards — were applied alone in the shared checkout and restored. COVERAGE records each: the bracket's D-203 re-read table, and the construction register for the window drop and the unwind guards. Three mutations redden nothing, each for a stated reason: a conditional post-admission drain, `dispatch` dropping while `REQUESTED`, and application's own `clear()`. **D-200 property 3's first-entry clause now has a falsifier**: a step that handles before reading the lifecycle request reddens the post-admission drain row alone.

## Composition

Built with `just build` and read through `measureAll()` from `bench/size/measure.ts`. **Before** is a detached worktree at `582092c1f`, without the owner's comment-only edit, which the minifier removes. **After** is this tree. Bytes; Brotli governs (§15).

| Row | min before | min after | Δ | Brotli before | Brotli after | **Δ** |
| --- | --: | --: | --: | --: | --: | --: |
| minimal | 34,363 | 34,431 | +68 | 10,358 | 10,392 | **+34** |
| minimal (xy) | 33,682 | 33,750 | +68 | 10,223 | 10,252 | **+29** |
| minimal + layoutAnimation | 35,342 | 35,410 | +68 | 10,683 | 10,708 | **+25** |
| xy + layoutAnimation | 34,661 | 34,729 | +68 | 10,574 | 10,586 | **+12** |
| minimal + landing | 34,756 | 34,824 | +68 | 10,507 | 10,542 | **+35** |
| complete | 35,735 | 35,803 | +68 | 10,835 | 10,874 | **+39** |
| free drag minimal | 26,869 | 26,937 | +68 | 8,108 | 8,130 | **+22** |
| free drag + bounds | 27,335 | 27,403 | +68 | 8,277 | 8,284 | **+7** |
| free drag + landing | 27,262 | 27,330 | +68 | 8,272 | 8,290 | **+18** |
| free drag complete | 27,728 | 27,796 | +68 | 8,423 | 8,456 | **+33** |
| both behaviors | 43,131 | 43,199 | +68 | 12,299 | 12,311 | **+12** |
| vocabulary root — `drag.js` | 252 | 252 | 0 | 142 | 142 | **0** |
| kernel root — `kernel.js` | 19,812 | 19,880 | +68 | 6,178 | 6,197 | **+19** |
| baseline A — non-composed | 35,028 | 35,096 | +68 | 10,667 | 10,679 | **+12** |
| baseline B — shipped package | 22,618 | 22,618 | 0 | 6,916 | 6,916 | **0** |

**No module entered or left any graph**, and no row breached its budget. **The two controls that cannot see the kernel did not move**, as predicted: `drag.js` reaches neither `execution.ts` nor `kernel.ts`, and baseline B measures `@ydinjs/drag`.

**+68 B minified on every kernel-carrying row** is the joint figure; it was not decomposed by ablation. What it contains: `construct` on both classes, the closure `Kernel.construct` hands the bracket, the `idle` getter and the pointer listener's guard, the three-state request and its branches, and the `dispatch` reshaping. Against it: the arm-time latch tests and the destroyed-in-window exit, `#admitting`, `#teardownPending`, the depth counter, the drain's re-entry guard and panic's `destroy()` call.

**The six `size.node` control equalities were already red at the input** (free drag ×4, `kernel.js`, baseline B), with different figures, so they cannot read this step and were not re-based (§18). Baseline B reads 6,916 against a declared 6,889 on both sides.

**Runtime.** Per pointer sample the bracket runs the same shape: one lifecycle test, the push, one boolean test, the drain, and a `REQUESTED` test on leaving, which replaces the old depth arithmetic. `#step` reads one field, as before. Nothing allocates per sample. `construct` allocates one closure per controller.

## Verification

- **Tests:** `just test` at the input had 10 failures and 2 browser files that do not load: six `size.node` controls, four `docs.node` surface rows, and `react.browser` and `stories.browser`, whose React and React DOM versions differ. After the step the failing set is the same, and 1,352 rows pass where 1,298 did.
- **Lint:** the five eslint errors that remain in `kernel.browser`, `features.browser` and `sortable.browser` are present at the input (`unbound-method` ×3, `no-unnecessary-condition`, `prefer-promise-reject-errors`). Markdown is reported as ignored by eslint, so it is formatted and not linted.
- **Typecheck:** the two errors in `.scripts/vitest-config.ts` and `.scripts/vitest-one-shot.ts` are present at the input.

## Limits and open items

- **Not re-run:** the pre-D-203 mutation figures COVERAGE keeps for `fail`'s and `cancel`'s construction-window guards, and the D-181 table's _`#spec` published before the pair is composed_ row. Its trigger, a destroy inside a frame factory, no longer reaches a retirement before publication.
- **Ingress that throws:** a throw escaping `admit` still skips the drain and leaves the queue to the next drain. Application's `clear()` is the only release for entries an admission dispatched before requesting destruction and then throwing. No row reaches that path.
- **Record defect, not in this step's scope:** in `request-application-claude.md` §7 as committed at `b36088c7e`, the rows R18–R21 are joined onto the end of the "No case pins…" paragraph at line 392, so they no longer render as table rows. Left for the record's owner.
- **Next:** step 2, the split and capture (D-201 step 2, carried).