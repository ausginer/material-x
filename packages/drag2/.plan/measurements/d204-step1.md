# D-204 step 1 — the runner and construction

> **D-205 checkpoint, 2026-11-01.** D-205 superseded D-204 after `2c5212daf` and moved the consumer round-trip's own unit into step 1. §D-205 checkpoint below records that work. **Step 1 is not complete and is not accepted**: one escalation under §8's first clause is open for the architect (§The open escalation). The sections above it describe `2c5212daf` as it landed, with reviewer-C's census corrected.

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

**Mutations.** Thirteen mutations of `execution.ts` and four of `kernel.ts` — the pointer listener's guard, the window drop, and both unwind guards — were applied alone in the shared checkout and restored. COVERAGE records each: the bracket's D-203 re-read table, and the construction register for the window drop and the unwind guards. Three mutations redden nothing, each for a stated reason: a conditional post-admission drain, `dispatch` dropping while `REQUESTED`, and application's own `clear()`. **D-200 property 3's first-entry clause now has falsifiers**: a step that handles before reading the lifecycle request reddens the post-admission drain row and `construction.node`'s _should apply no window action once a window destruction is applied_. ~~reddens the post-admission drain row alone~~ was corrected after the step-1 review (reviewer-C), and re-run over the whole suite: 2 rows.

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

## D-205 checkpoint — the round-trip's own unit

**Input.** `7b7972db4` (D-205), implementation `2c5212daf`, the step-1 feature proof [`d204-step1-feature-proof-claude.md`](../reviews/fin-review2/d204-step1-feature-proof-claude.md). `src/` is unchanged from `2c5212daf` to `7b7972db4`. The owner's uncommitted `tests/kernel/seams.node.test.ts` assertion edit is preserved and left uncommitted. This checkpoint commits only its own hunk in that file, the reviewer-D comment.

### What landed

| Item | Where |
| --- | --- |
| The release unit holds the staged command in the attempt slots and queues `OPEN_RESOLUTION` with the operation identity, the `invoke: null` command included. It no longer opens the round-trip | `kernel.ts` `#closeOperation`, `actions.ts` |
| **Carrier**: `AttemptSlots.command`, cleared by `#retireAttempts`, so it goes at retirement, when a failure checkpoint applies, and at teardown. One slot write and one queue entry per drop, nothing per sample | `kernel.ts` |
| **Entry condition, in full**: the identity is current, the phase is `RELEASING`, not yet opened (the held command, which opening consumes), and no `cancelRequest` | `kernel.ts` `#handleOpenResolution` |
| **Cancel stage rule** (F-435): `AT_CONSUMER` exactly when the resolution attempt is present, i.e. `OPEN_RESOLUTION` opened the round-trip. No longer read from the phase | `kernel.ts` `#handleCancel` |
| The staging conditional is **kept** until step 3, as §8 permits. It now reads only the cancel request | `seams.ts` |
| **reviewer-B**: an unrequested release (panic) leaves a settled promise, so a later `destroy()` returns a settled promise, the same one on every call | `execution.ts` `#release` |
| **reviewer-C**: the first-entry census reads 2 rows over the whole suite, in COVERAGE and above | `tests/COVERAGE.md`, this record |
| **reviewer-D**: the `seams.node` comment names the current panic body; 01 names `#arm()` inside `Kernel.construct` | `tests/kernel/seams.node.test.ts`, `contract/01` |
| Contract: 02 §The staged value never outlives its transaction, §`ResolutionCommand` (the unit, its entry condition, its carrier), §The settlement input's stage rule, §No start, no terminal, §Release ordering; 06's trace step | `.plan/contract/` |

### Cases — implementation verification

Each row raises its request from a seam the running controller drives, in `tests/kernel/kernel.browser.test.ts` §the round-trip unit. None uses a harness flag.

| Case | Row | At `2c5212daf` |
| --- | --- | --- |
| R4 | _should open no round-trip for a cancel requested in the release effect_ | red (`AT_CONSUMER`) |
| R5 | _should open no round-trip for a destroy requested in the release effect_ | red (round-trip opened) |
| R6 | _should settle a cancel requested from inside the round-trip at the consumer stage_ | green, as required: unchanged |
| R22 | _should decline the round-trip for a cancel requested by an action the release effect dispatched_ | red |
| R28 | _should open no round-trip for a destroy requested in the release prepare_ | red |
| R29 | _should open no round-trip for a destroy requested by an action the release effect dispatched_ | red |
| order | _should apply work the release effect dispatched before the round-trip opens_ | red |
| `invoke: null` | _should decline a null command for a cancel requested by an action the release effect dispatched_ | not run at `2c5212daf`; it reddens under the inline-open mutation |

"At `2c5212daf`" means the four kernel files restored to `HEAD` and the rows run, then restored. reviewer-B's three rows are in `execution.node`. Removing the fix reddens _should have settled its promise when destruction is requested after a panic_ alone.

**Mutations**, each alone, over the whole suite. COVERAGE §The consumer round-trip's own unit has the table: inline open 6, cancel clause 2, stage from phase 3, reviewer-B's fix 1. Four mutations redden nothing, each with a stated reason: the phase clause, the identity clause, keeping the command after opening, and keeping it at retirement. The phase clause gains R4 as its witness once step 3 deletes the staging conditional.

### Model evidence, kept apart

`run.sh` reran the reference model at this tree: R1–R14, R22, R28 and R29 report `ok`. **This is evidence that the semantics are coherent, not about `src/`.** The model is a self-contained toy and imports nothing from `src/`. Its step-1 mode is the model's evidence that R5 and R28 discriminate. The browser rows above are the implementation's.

### `release.effect` inventory (§8 step 1)

- **Neither behavior's `release.effect` dispatches.** The sortable's spatial frame task and invalidation listener are motion-scoped and disposed before `release.prepare`. Free drag's effect writes the lift and nothing else.
- **Consumer code reached from `release.effect` can dispatch.** For the sortable, that is a custom placeholder's `connectedCallback`/`disconnectedCallback` inside `movePlaceholder`, calling `invalidate()` (`TAG_COLLECTION`), `cancel()` or `destroy()`. For free drag, the only synchronous consumer reach is a custom-element visual observing `style`, which could call `moveTo()`/`invalidate()`.
- **Free drag's actions are no-ops at `RELEASING`** (`prepareAction` discards outside `ACTIVATING`/`ACTIVE`), so the new order changes nothing there.
- **The sortable's collection action at `RELEASING`** pulls `items()` and publishes the snapshot without cancelling. It now runs before `onReorder` rather than after. Without a throw, the outcome is the same and only the call order changes (§2.8 anticipates this). With a throw it changes the terminal; see below.
- `cancel()` and `destroy()` raised there are R4 and R5.

### The open escalation

**§8's first escalation clause is met, and this checkpoint does not decide it.** It does not amend the contract to accept the changed terminal. The architect resolves it against this fixed tree.

**Path.** A sortable with a custom placeholder whose `connectedCallback` calls `controller.invalidate()` during the release move, `items()` throwing, and `onReorder` settling **synchronously**.

| Tree | Trace (from the placeholder's connection) | Errors (stage) | Terminal |
| --- | --- | --- | --- |
| `2c5212daf` (= baseline for this path) | `placeholder connected`, `onReorder`, `items()`, `onFinish`, `onError` | `[4]` | `accepted` |
| this checkpoint | `placeholder connected`, `items()`, `onReorder`, `onError`, `onCancel` | `[4]` | `canceled` (the failure fallback) |
| either, **async** `onReorder` | `onReorder`/`items()` in the tree's order, then `onError`, `onCancel` | `[4]` | `canceled` on both |
| either, `items()` not throwing | the tree's order, `invalidateInsertion`, `onFinish` | none | `accepted` on both |

**Why.** At the baseline a synchronous resolution queues `RESOLUTION_SETTLED` ahead of the collection action's `FAILED`, so the settlement wins and the checkpoint arrives stale. Under D-205 the action runs first, and its `FAILED` lands ahead of `RESOLUTION_SETTLED`, so the failure decides. That is what the async resolver already got on both trees. Every call is made on both trees, and only the `onEnd` arm differs. Whether that difference is an argument value under property 13 or a changed published outcome is the architect's question. The baseline trace was taken with `src/kernel/` restored to `HEAD` (`2c5212daf`'s `src/`). `582092c1f` was not run separately for this path, and no destroy request is involved in it.

**Reproducer.** Append to `tests/sortable/sortable.browser.test.ts`, which supplies `createHarness`, `REENTRANT_PLACEHOLDER`, `reentrantPlaceholderConnected`, `activate`, `release`, `reported` and `ReorderResolution`. Then run `npx vitest run -c vitest.config.ts --project browser --silent=false tests/sortable/sortable.browser.test.ts -t PROBE`. It was not committed into the suite, because it asserts no outcome.

```ts
describe('PROBE inventory', () => {
  for (const throwing of [false, true]) {
    for (const sync of [true, false]) {
      it(`PROBE collection from the release placeholder throwing=${String(throwing)} sync=${String(sync)}`, async () => {
        let armed = false;
        let harness: Harness | null = null;

        harness = createHarness({
          placeholder: (): HTMLElement =>
            document.createElement(REENTRANT_PLACEHOLDER),
          pull: (items) => {
            harness!.calls.push('items()');
            if (armed && throwing) {
              throw new Error('pull');
            }
            return items;
          },
          onReorder: (request) => {
            harness!.calls.push('onReorder');
            return sync
              ? ReorderResolution.accept()
              : Promise.resolve(ReorderResolution.accept());
          },
        });

        activate(harness);
        reentrantPlaceholderConnected = (): void => {
          if (!armed) {
            armed = true;
            harness!.calls.push('placeholder connected');
            harness!.controller.invalidate();
          }
        };
        harness.next(harness.gap(2));
        release(130);
        await new Promise((resolve) => {
          setTimeout(resolve, 20);
        });
        console.log(
          `PROBE throwing=${String(throwing)} sync=${String(sync)}`,
          JSON.stringify(
            harness.calls.slice(
              harness.calls.indexOf('placeholder connected') - 1,
            ),
          ),
          JSON.stringify(harness.errors.map((e) => e.stage)),
          JSON.stringify(reported.map((e) => e.message)),
          JSON.stringify(
            [...harness.finishes, ...harness.cancels].map((r) => r.type),
          ),
        );
        expect(true).toBe(true);
      });
    }
  }
});
```

### Property 13 — interim outcomes at this checkpoint

From `run.sh`'s P4, P5 and P7 at this tree (Chrome, package browser project), against the baseline and target in request-application §7 and §12.2:

| Case | Outcome now |  |
| --- | --- | --- |
| R2, R5, R7, R28, R29, R22 (cancel from an action) | required | P5 / P7 |
| R4 | required. The stage argument moved from the baseline's `AT_CONSUMER` to `AT_PROPOSAL`; no round-trip on either | P5 |
| R3 — cancel in `activation.prepare` | **baseline**: rollback, retire, no `onStart` | P5; step 3 |
| R8 — late cancel in `anchorTarget` | **baseline**: the first operation stays in `SETTLING`, no `finalized`, and the second press admits nothing | P4; step 3 |
| R1, R9–R11, R13, R15, R17, R23–R27 | required, as tests | above |
| R12, R14, R16, R18–R21 | not probed against `src/` at this checkpoint; booked to steps 2–4 | — |

No probed row makes a consumer call that both the baseline and the target withhold. The open escalation is the one path where the published terminal differs from the baseline in a way neither §7 nor §12 states.

### Composition

`just build`, read through `measureAll()`. **Before** is `HEAD`'s `src/` (equal to `2c5212daf`'s), measured in this tree with the six changed source files restored and then put back. It reproduces the step-1 "after" column above byte for byte. **After** is this tree. Bytes; Brotli governs (§15).

| Row | min before | min after | Δ | Brotli before | Brotli after | **Δ** |
| --- | --: | --: | --: | --: | --: | --: |
| minimal | 34,431 | 34,704 | +273 | 10,392 | 10,412 | **+20** |
| minimal (xy) | 33,750 | 34,023 | +273 | 10,252 | 10,289 | **+37** |
| minimal + layoutAnimation | 35,410 | 35,683 | +273 | 10,708 | 10,767 | **+59** |
| xy + layoutAnimation | 34,729 | 35,002 | +273 | 10,586 | 10,626 | **+40** |
| minimal + landing | 34,824 | 35,097 | +273 | 10,542 | 10,572 | **+30** |
| complete | 35,803 | 36,076 | +273 | 10,874 | 10,917 | **+43** |
| free drag minimal | 26,937 | 27,210 | +273 | 8,130 | 8,165 | **+35** |
| free drag + bounds | 27,403 | 27,676 | +273 | 8,284 | 8,325 | **+41** |
| free drag + landing | 27,330 | 27,603 | +273 | 8,290 | 8,329 | **+39** |
| free drag complete | 27,796 | 28,069 | +273 | 8,456 | 8,476 | **+20** |
| both behaviors | 43,199 | 43,472 | +273 | 12,311 | 12,348 | **+37** |
| vocabulary root — drag.js | 252 | 252 | 0 | 142 | 142 | **0** |
| kernel root — kernel.js | 19,880 | 20,153 | +273 | 6,197 | 6,235 | **+38** |
| baseline A — feature-matched, non-composed | 35,096 | 35,369 | +273 | 10,679 | 10,720 | **+41** |
| baseline B — shipped @ydinjs/drag sortable.js | 22,618 | 22,618 | 0 | 6,916 | 6,916 | **0** |

**No module entered or left any graph**; the module lists are identical once the per-run synthetic entry path is set aside. No row breached its budget. `drag.js` and baseline B did not move. +273 B minified on every kernel-carrying row is the joint figure: `#handleOpenResolution` with its four conditions, the new `OPEN_RESOLUTION` case, the `command` slot and its two clears, the queue call in the release callback, the stage read, and the settled-promise line in `#release`. It was not decomposed. The six `size.node` controls stay red as at the input and were not re-based (§18).

**Runtime.** Per pointer sample, nothing changes. Per drop, one slot write, one queue entry and one extra drain step.

### Verification

- **Tests:** the full suite has the input's failing set: six `size.node` controls, four `docs.node` rows, and `react.browser` and `stories.browser`, which do not load. 1,363 pass where 1,352 did.
- **Lint**, over the nine changed `.ts` files: 8 eslint errors, every one present in the same files at `HEAD`. A ninth at `HEAD` is the one the owner's uncommitted `seams.node` edit removes. Markdown is reported as ignored, so it is formatted and not linted.
- **Typecheck:** the two `.scripts/vitest-*.ts` errors, as at the input.

### Unfinished, stated explicitly

- **The open escalation** above. Step 1 is not complete until it is decided.
- **F-438 stays open.** Its required property holds on every probed and tested path. Closing it is the reviewer's and architect's call, not this checkpoint's.
- **Not run:** `582092c1f` for the escalation path; R12, R14, R16 and R18–R21 at this tree; a collection witness for the held command's release.
- **Not started:** step 2. `d205-requests.md` is not created, so D-205's witness holds.