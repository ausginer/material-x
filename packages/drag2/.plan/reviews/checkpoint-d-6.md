# Checkpoint D sixth closure review — not ready to close

I independently reviewed the Checkpoint D plan and exit conditions, the fifth-review architect and implementation records, the current source and tests, the parity ledger, and the completed sortable stretch-table discharge evidence. I also ran the unchanged verification gates and used temporary browser probes for two disputed stretches; both probes were removed afterwards.

The fifth-review pass made substantial progress, and C5-01 is closed. The checkpoint still cannot close. The stretch table contains several rows whose stated discharge is false, omits at least one module and one consumer-reaching activation stretch, and therefore does not satisfy its own `0 (d)` closure condition. Current public/normative size evidence also predates the review-5 rebase.

## Verdict

| Item | Sixth-review result |
| --- | --- |
| C5-01 — layout-animation subscription | **Closed.** The post-subscription reading and accessor/thenable regressions cover the reported path. |
| C5-02 — placeholder mechanics | **Keep open.** The first style write is still reachable after destruction from the `style` accessor (C6-02). |
| C5-03 — I-6/I-36 and landing bracket | **Keep open.** The claimed `retarget` bracket runs too early under nested teardown and does not undo the consequential tail (C6-01). |
| C5-04 — supporting-document cleanup | **Primary corrections closed.** Q-7/Q-12 and the prior parity explanation are corrected; new live size and provenance residues remain (C6-07, C6-08). |
| Sortable stretch-table discharge | **Not discharged.** It has incorrectly classified and missing stretches and does not account for all twenty modules. |
| L-11 | Remains explicitly assigned to Phase 23; this review does not reopen it. |
| Checkpoint D | **Keep open.** |

## C6-01 — major: the default landing runner starts a new animation after nested teardown

The stretch table classifies `landing.ts`'s `retarget` sequence as bracket-discharged by teardown (`.plan/contract/05-lifecycle-invariants.md:459`). That bracket is not after the whole stretch when teardown is reentrant:

1. `retarget()` reads `realm.window.getComputedStyle(visual)` (`src/sortable/landing.ts:180-181`).
2. If that consumer-reachable call destroys the controller and returns normally, `retireAttempts()` nulls the published handle and calls its `destroy()` (`src/kernel/kernel.ts:395-417`). That cancels only the animation currently stored in the handle.
3. Control returns to `retarget`, which increments the generation, cancels the old animation again, and calls `play()` (`landing.ts:183-185`).
4. `play()` starts and publishes a **new** animation (`:122-161`) after retirement has completed. The kernel has already discarded its only handle reference, so nothing owns or cancels this animation.

I reproduced this through the public composition with a temporary browser regression. A late readiness acknowledgement triggered the default retarget; the `getComputedStyle` override obtained the real declaration, destroyed the controller, and returned it. Expected `item.getAnimations()` after `ready()`: `[]`; received: one live `Animation`. The focused file had 49 existing tests pass and this probe fail. The existing retarget test (`tests/sortable/features.browser.test.ts:675`) covers cancellation during a normal retarget, not terminal reentry.

The same ordering problem can begin at the returned declaration's `transform` getter, the old animation's `cancel()`, or any consumer-reachable part of the subsequent `play()` acquisition. The table's named `retireSettlement` bracket also has no source symbol; the actual teardown function is `retireAttempts`, and it is not an after-stretch revalidation here.

This is the bracket-discharge falsifier C5-03 itself states: the stretch starts a continuation after the purported undo. `landing.ts` needs a liveness mechanism that covers `retarget`, or a genuinely after-stretch bracket that can undo the new animation, plus a permanent regression for normal-return destruction during retarget.

## C6-02 — major: `applyMechanics()` writes after destruction from the `style` accessor

C5-02 reordered the mechanics reads and added one `live()` check per write. The first style write is not actually reading-headed:

```ts
if (!live()) return;
const { style } = placeholder; // overridable accessor; may destroy
style.boxSizing = 'border-box'; // surviving mutation after teardown
if (!live()) return;
```

The exact sequence is `src/sortable/placement.ts:93-104`. A consumer-owned placeholder can override `style`, destroy synchronously, and return the real declaration. `boxSizing` is then written after teardown to an element the library never adopted and will never restore — I-36 floor act 3.

I reproduced this in Chromium with a temporary direct regression. Expected `style.boxSizing`: `''`; received: `'border-box'`. The 16 existing focused tests passed. Current placement coverage exercises `setAttribute` destruction and visual offset getters (`tests/sortable/placement.browser.test.ts:99-159`), but not the `style` getter. The table row claiming six reading-headed write stretches (`contract/05:437`) is therefore at least one `(d)` row.

## C6-03 — major: `placeholder()` has the same missed accessor boundary

`placeholder()` checks `live()` before evaluating `element.classList.add(...)` (`src/sortable/placeholder.ts:56-59`). `classList` is itself an overridable accessor on the consumer-created element. If that getter destroys and returns the token list, `.add()` mutates the unadopted element after teardown. The current regression covers destruction inside the `create()` factory, not destruction in the later `classList` getter.

The table collapses `create() → reading → classList.add` into one `(a)` row (`contract/05:460`), contrary to its own rule that an overridable accessor begins a new consumer-reaching stretch (`:398`). Split the factory-to-reading stretch from the `classList`-to-mutation stretch, guard the latter, and pin the accessor path.

## C6-04 — major: active `moved()` is neither bracket-discarded nor undone

The table marks `moved: lift.write → spatialSeq → frame.schedule` as `(b)`, allegedly undone by the frame task and queue (`contract/05:416`). Current source has no liveness check in that sequence (`src/sortable/spec.ts:616-630`).

`VisualLiftSession.write()` evaluates `visual.style` and then assigns `transform` (`src/kernel/presentation.ts:312-320`). If the style getter destroys and returns normally, teardown restores the captured style lease first (`presentation.ts:140-158`); control then returns and writes the transform **back after teardown**. `moved()` also increments state and schedules a fresh frame after `retire()` already cancelled the old one. The later `runtime.view === null` check prevents dispatch when the rAF fires, but it neither removes the post-terminal transform nor cancels the newly scheduled task.

This same accessor hazard is already recognized and guarded on the release render (`spec.ts:1048-1058`). The hot path needs an all-or-nothing/undo mechanism around the write itself and a closed check before scheduling; a behavior-side check only after `lift.write` is insufficient to remove the transform that was written after the one-shot disposer ran. Add an active-move regression instrumenting `visual.style` and the rAF producer.

## C6-05 — major: activation listener installation is a missing consequential stretch

Activation calls the invalidator and then publishes `rt.placeholder`, `rt.lift`, and `rt.view` before `onStart` (`src/sortable/spec.ts:561-608`). The invalidator invokes `realm.window.addEventListener` twice (`src/kernel/invalidation.ts:23-35`). Those platform methods are consumer-reachable by the table's own rule — it already includes the same realm's `matchMedia` in the landing stretch.

If the first `addEventListener` override destroys and returns normally, teardown completes, the second call still runs, and activation then republishes the retired operation and calls `onStart`. No liveness check exists after listener installation. This is I-36 floor acts 1, 2, and 4, and the activation rows at `contract/05:413-415` do not enumerate it. Add a reading after installation and a public-composition regression that destroys from the first listener registration.

## C6-06 — blocking evidence defect: the directory-complete table omits `callbacks.ts`

The table claims twenty modules are completely accounted for: fourteen with stretches and six explicitly listed without them (`contract/05:406`, `:468`). In fact it has rows for only thirteen unique modules; adding the six no-stretch modules accounts for nineteen. `src/sortable/callbacks.ts` is missing from both sets.

`callbacks.ts` appears to be a no-stretch module — it captures callback options but invokes none — so this is likely an accounting correction rather than another runtime defect. It still falsifies the exact completeness condition Checkpoint D adopted. Record it explicitly, correct the 14/6 module split, and regenerate the stretch totals after the `(d)` rows above are fixed. The published `62 stretches / 0 (d)` headline cannot be retained.

## C6-07 — moderate: the re-based size harness and live documents disagree

The size harness is green and its re-based budgets are current, but README and normative contract 03 still publish the pre-review-5 figures and say they were measured after four reviews (`README.md:107-123`; `.plan/contract/03-feature-composition.md:679-695`). The live exact measurements are:

| composition | current Brotli |
| --- | ---: |
| minimal | 10,199 B |
| minimal (`xy`) | 10,245 B |
| + `layoutAnimation()` | 10,653 B |
| + `landing()` | 10,487 B |
| complete | 11,025 B |
| baseline A | 10,765 B |
| baseline B | 6,889 B |

Therefore composition costs **260 B / 0.26 kB / about 2.4%**, migration costs **3,310 B / 3.31 kB**, and live-composition headroom against the rebased budgets is **133–175 B**, not the published 266 B, 3,227 B, and 0.11–0.16 kB. Phase 21's own done condition says every number in a contract, README, or budget is re-measured or explicitly reaffirmed (`plan.md:907`), so that phase's pulled-forward discharge is not complete as documented.

## C6-08 — minor documentary integrity issues

- The working tree renamed the fifth review to `checkpoint-d-5.md` and deletes `checkpoitn-d-5.md`, but the plan and both resolution records still link the deleted spelling and explicitly say it was kept (`plan.md:824`; `checkpoint-d-5-resolution-implementation.md:5`; `checkpoint-d-5-resolution-c5-03.md:5`). Either restore the historical filename or update all references and the explanation.
- The parity ledger says the `DragSubject` omission is decided per entry and that the fixture checks the entries drag2 publishes (`ledger.md:276`), while the negative assertion only checks `@ydinjs/drag2/sortable.js` (`tests/consumer.node.test.ts:309-320`). The sortable-entry decision is pinned and no open sortable parity row remains; narrow the plural claim or add the intended `drag.js` assertion when that entry's migration surface is decided.

## What is closed

- C5-01's animation acquisition now revalidates after both the `finished` accessor and `.then()` before `running.set()`, and both normal-return destruction variants have permanent regressions.
- The earlier candidate-cache, placeholder-anchor, release-render, resolution-accessor, and destination-reanchor fixes remain present; this review does not revert their individual closure.
- C5-04's Q-7/Q-12 corrections are consistent in the current normative sources.
- The sortable parity ledger has no remaining Checkpoint D parity decision; L-11 remains a deliberate Phase 23 follow-up rather than a reason to reopen D by itself.

## Verification performed

From `packages/drag2`:

```text
npx just typecheck
  PASS

npx just test
  PASS outside the sandbox (the browser runner needs a local port)
  33 test files passed
  768 tests passed
  18 skipped
  no type errors

npx just size
  PASS — all seven measurements satisfy the rebased budgets and graph assertions

Temporary public landing-retarget regression
  FAIL as expected
  Expected surviving animations: 0; received: 1
  Existing focused tests: 49 passed

Temporary placement-style regression
  FAIL as expected
  Expected boxSizing after getter-triggered teardown: empty; received: border-box
  Existing focused tests: 16 passed
```

Both temporary regressions were removed. No production or test source remains changed by this review. Checkpoint D can close only after the runtime `(d)` stretches are fixed and pinned, the stretch table is regenerated and complete against all twenty modules, and the live size/provenance documents agree with the rebased harness.
