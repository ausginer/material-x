# Probe api-4 — the transaction bracket, deferred `destroy()`, and `panic()`

**Question.** Synthesis v3 §3 replaces per-statement `live()` liveness with a **transaction bracket**: an explicit outermost synchronous library transaction, inside which a requested `destroy()` defers physical teardown until the transaction unwinds, and validity is revalidated once at the boundary rather than before every write. Can that single revalidation replace the ~33 consumer-facing liveness call sites, and what happens to `panic()`?

**Shape.** A throwaway spike on branch `worktree-agent-a4d0ec4ad722d3a16`, two commits, discarded. Existing tests are the instrument; the deliverable is the classification of what they say, not a green suite.

- `aac921cb` — the bracket, deferred `destroy()`, the activation `rollback`, and the **maximal** liveness strip (every one of the 33 removed except two).
- `a6d73c40` — the **floor-preserving** variant: the five readings the maximal strip could not justify are put back, one at a time, and the recovery measured.

The two commits exist because the difference between them **is** A1's answer.

Baseline before the spike: browser `560 passed | 18 skipped`, node `5 failed | 175 passed | 10 skipped` (five pre-existing failures needing a build artefact), typecheck three pre-existing errors. The spike adds **zero** node failures, **zero** new typecheck errors in `src/`, and `src/` lints clean.

---

## Answers, one line each

|  | Falsifier | Result |
| --- | --- | --- |
| **A1** | the 18 `live()` calls all die | **BROKE.** 14 die outright; 4 are a residue the bracket cannot discharge, and 2 published ceilings must be withdrawn to retire the rest |
| **A2** | `panic()` cannot be deferred | **HELD, and improved the model.** Deferral is one stack frame wide, runs no library code, and moves teardown _out_ of the broken stack |
| **A3** | exception safety | **HELD.** Observed, four cases |
| **A4** | the `Promise<void>` is honest | **HELD** semantically, **changed the model** ergonomically: 46 first-party call sites become `no-floating-promises` errors |
| **A5** | activation `rollback` (S-3) | **HELD**, with one stated fidelity limit; and the plan's "the destroy instance disappears on its own" is **only half true** |
| **A6** | post-release `cancel()` (C-2) | **HELD** for reachability, abandonment, single terminal and rejection safety; the terminal type is **`canceled` today, not `aborted`** |

---

## 1. The bracket primitive, as built

Small enough to state completely. It is **one counter and two entry sites** in `src/kernel/kernel.ts`.

```ts
let depth = 0; // outermost synchronous library transaction
let torndown = false; // physical teardown happens once
let completion: PromiseWithResolvers<void> | null = null;
```

**Entry.** Exactly two places open the bracket, and between them they own every stretch of synchronous library execution:

```ts
const runDrain = (): void => {
  // one closure per controller: hot path
  depth += 1;
  try {
    drain(queue, handle, panic);
  } finally {
    leave();
  }
};
```

- `runDrain` replaces the bare `drain(...)` call in `dispatchKernel`. Everything the queue sequences is therefore inside it: every seam, every behavior action, every consumer callback the kernel invokes, **and the synchronous `activate()` reached from `handleMove`** — which the probe plan listed as uncovered but which is already inside the drain, because `handleMove` _is_ a queue handler.
- `openIngress` opens the bracket around `admit()` **and** its trailing drain, so the nested `runDrain` nests rather than closing the transaction underneath a half-written admission. `admitting` is unchanged and still owns the deferral of the drain itself.

**Exit.** One function, and it is §3's "revalidate once at the boundary":

```ts
const leave = (): void => {
  depth -= 1;
  if (depth === 0 && destroyRequested) {
    finishTeardown();
  }
};
```

**`destroy()` splits in two.** The logical close is immediate and unconditional; the physical teardown is what defers:

```ts
const destroy = (): Promise<void> => {
  if (!queue.closed) {
    queue.closed = true; // every entry guard in the kernel now fails
    destroyRequested = true;
    clearQueue(queue); // no queued argument outlives the drain
    if (depth === 0) {
      finishTeardown();
    }
  }
  if (completion === null) {
    completion = Promise.withResolvers<void>();
    if (torndown) {
      completion.resolve();
    }
  }
  return completion.promise;
};
```

`finishTeardown` is the old `destroy()` body minus steps 1 and 2, latched on `torndown`, resolving `completion` in its `finally` beside `ingress.abort()`.

**Three things the shape makes explicit and that an implementer must not change:**

1. **The latch is not deferred; only the teardown is.** Every existing `queue.closed` read in the kernel keeps working unmodified. This is why deferral costs so little: the 15 kernel-side reads are _entry_ guards (`dispatch`, `cancel`, `presentationCommitted`, `openIngress`) and _boundary_ revalidations (`preparationValid`, `runAdmission`'s post-callback recheck, `settlementLive`, `joinLive`), not per-statement liveness. **The model does not retire any of them, and should not claim to.**
2. **The completion token is allocated lazily**, so `void controller.destroy()` in the ordinary case pays for no Promise.
3. **`openIngress`'s bracket must span the trailing drain**, not just `admit()`. Otherwise a resolver's `destroy()` tears down between admission and the drain that is about to observe the committed outcome.

**Cost.** One integer increment/decrement and one branch per drain, plus one closure per controller. No allocation on the hot path. Not measured further — this probe claims no performance result.

---

## 2. A2 — `panic()`. **HELD, and it improved the model.**

This was the stop condition. It did not fire.

### 2.1 The structural fact the plan did not have

**`panic()` has no producer reachable from behavior or consumer code.** Verified by enumerating every `spec!.*` call site in `src/kernel/kernel.ts`: each is inside a seam phase (`runPhase`), a `runLeaf`/`runLeafValue`, or a `guarded`. The documented producer — `refuseReentry`'s latch at `src/kernel/seams.ts:296`, rethrown past every classification by `runPhase` — needs a **nested seam**, and the run-to-completion queue makes that unreachable: a nested `dispatch` appends and returns.

The only unwrapped foreign read left on a queue handler is `spec!.config.threshold`, consulted by `handleMove` outside any seam (`kernel.ts` ~`:1796` pre-spike). The probe uses a throwing accessor there to manufacture a real panic; that is what `tests/probe-a-transaction-bracket.browser.test.ts` `describe('A2')` drives.

### 2.2 The dilemma dissolves

The plan framed A2 as a dilemma: _defer the panic and you keep running library code after an unexplained throw; do not defer and you reintroduce mid-stack physical teardown._ **Both horns rest on treating "the latch" and "the teardown" as one act.** They are not, and separating them is what the bracket is.

`panic` is reached from `drain`'s `catch` — which is **after** the loop has exited. So:

```text
throw escapes handle
    ↓  drain's catch
panic(error)
    ↓  destroy(): queue.closed = true, queue cleared, teardown deferred
report(error)                       ← the only statement in between
    ↓  drain's finally, then runDrain's finally
leave() → depth 0 → finishTeardown()
```

The deferral is **one stack frame wide** and the only thing that executes inside it is `report`, which touches no library state (`src/kernel/reporter.ts` — a `globalThis.reportError` lookup inside a `try`). No library code runs after the unexplained throw, and no physical teardown runs on the broken stack. The plan's "hardest exceptional path" is the _easiest_ one under the bracket, because the throw has already unwound everything the deferral would otherwise have to worry about.

### 2.3 The observable

Pinned in the probe suite, and it is the sharpest single piece of evidence that the bracket does what it says:

```ts
it('should report before it retires, because teardown left the throwing stack');
expect(held.order).toEqual(['report', 'retire']);
```

Pre-spike, `panic` was `destroy(); report(error)` with `destroy()` running `guarded(spec.retire)` inline, so the order was `['retire', 'report']` — teardown _inside_ the broken stack, first. Under the bracket it is `['report', 'retire']`. Teardown demonstrably left the throwing stack. Terminality, error reporting and idempotence are pinned alongside it (4 further cases, all passing).

### 2.4 What A2 _did_ change — the reading, not the deferral

**`scope.presentation.signal.aborted` stops being a liveness reading.** This is the one thing in A2 that changed the model, and it is not optional.

`src/sortable/spec.ts:516` and `:557` deliberately read the abort signal rather than `rt.closed`, on the stated ground that it is _strictly stronger_ — it also fires for a kernel-internal `panic()` destroy that the controller latch never sees (`src/sortable/runtime.ts:127-131`). Under deferral it becomes strictly **weaker**: the presentation lifetime is disposed at the boundary, so the signal now _lags_ the logical close it was standing in for.

Measured directly. With the bracket in place and **nothing else changed**, the whole browser suite produced exactly three failures, all of them here:

- `sortable.browser.test.ts:793` should stop when the placeholder insertion destroyed the controller
- `sortable.browser.test.ts:948` should not republish runtime state after a reentrant destruction
- `sortable.browser.test.ts:2986` should start nothing when a survival conjunct destroys the controller

All three are `onStart` firing after a destroy. The fix is to read the logical latch (`rt.closed`), and the two sites collapse to **one** reading placed immediately before the publication block — §3's own "revalidate before publication / next lifecycle callback".

**Rule for the implementer:** _once teardown is deferred, no physical-teardown observation (an abort signal, a nulled slot, a removed node) may be used as a liveness reading._ A behavior needs the logical latch.

Reading `rt.closed` there reintroduces no panic blind spot **today**, because `panic()` is only reachable from `drain`'s catch, by which point every behavior frame has unwound and no seam can resume. It does mean the behavior has no reading at all for a hypothetical future non-unwinding panic — which is an argument for exposing the kernel's logical latch on `KernelHost` if such a path is ever created, and against creating one.

---

## 3. A1 — the liveness surface. **BROKE.** The headline claim is overstated.

### 3.1 The count

Baseline, as the brief states it: **33** consumer-facing sites — 13 `rt.closed` guard reads, 18 `live()` calls, 2 `scope.presentation.signal.aborted`.

| variant | retained | **retired** | browser failures |
| --- | --- | --- | --- |
| baseline | 33 | — | 0 |
| **maximal** (`aac921cb`) | 2 | **31** | 37 |
| **floor-preserving** (`a6d73c40`) | 6 | **27** | 21 |

Kernel side: **15** `queue.closed` reads in `kernel.ts`, **0 retired**, and none should be — see §1(1). Reporting them as part of the retired surface would be wrong.

The six retained in the floor-preserving variant, exhaustively:

| site | kind |
| --- | --- |
| `src/sortable/controller.ts:76` | **not a liveness guard.** `updateItems()`'s public inertness after `destroy()`, which validates and throws before anything reaches the kernel. Was never in scope |
| `src/sortable/spec.ts:584` | **the model's own** single pre-publication revalidation. Replaces the two `signal.aborted` reads |
| `src/sortable/spec.ts:182` | residue — act 4 |
| `src/sortable/spec.ts:837` | residue — act 4 |
| `src/sortable/rect-index.ts:108` | residue — act 4 |
| `src/sortable/rect-index.ts:138` | residue — act 4 |

So the honest figure is: **the bracket retires 27 of 33, replaces 2 more with 1, and leaves 4 it cannot discharge.** The 18 `live()` calls do not all die: 14 do, and the remaining 4 sites (2 of them formerly `live()`, 2 formerly `rt.closed`) survive as one irreducible class.

### 3.2 The enumeration the brief asked for: what else reaches these sites

| reaches the site | disposition |
| --- | --- |
| **`cancel()` latching** | **impossible to harm.** `cancel` sets `cancelRequest` and _queues_ `CANCEL`; nothing physical happens mid-stretch. `preparationValid()` reads the latch and discards the seam at the boundary. No `live()` call ever read the cancel latch, so none was there for this |
| **a classified failure** | **impossible to harm.** `host.fail`/a throw latches `failureRequested` and queues a checkpoint; `retireOperation` runs only from a queued `RETIRE`, i.e. a later drain iteration, never mid-stretch |
| **a consumer throw** | **harmless.** Caught by `runPhase` and classified, or it escapes to `panic` — where §2 applies |
| **`panic()`** | **harmless under the bracket.** The one path that used to tear down mid-stack no longer does |
| **`destroy()` — the physical effects** | **harmless.** The four things the guards actually protected (see below) are all undone at the boundary |
| **`destroy()` — the act of calling consumer code** | **the residue. Not discharged.** |

The physical hazards, and why each dies:

- _dereferencing state `retire()` nulled_ (`rt.lift!.write(...)`, `rt.view`) — `retire()` no longer runs underneath the stretch.
- _frame writes into a scrubbed frame_ (`draft.insertion`, `draft.proposal`, `draft.domain`) — the boundary scrubs both frames afterwards.
- _DOM mutation teardown will not undo_ (`movePlaceholder`, the re-anchor's `item.before(placeholder)`) — the presentation lifetime removes the placeholder at the boundary.
- _publications that outlive the operation_ (`rt.pendingRequest`, `rt.placeholder`, a started WAAPI animation) — `retire()` clears and cancels them at the boundary, and — importantly — sees a **complete** `running` map rather than the partial one the old mid-stack teardown saw.

### 3.3 The residue: I-36 (2) **act 4**

> _invoking a declared consumer callback — a slot the consumer filled — after the controller closes._

The bracket makes an act _consequence-free_ by undoing it. It cannot do that for a call, **because for a call the consequence is the call.** A consumer whose `visual()` resolver called `destroy()` still gets `visual()` invoked again for candidate 2.

Four sites, all the same shape:

1. `spec.ts` `resolveItem` — a `handle()` resolver destroys, and `seedDraft` invokes `visual()` immediately after.
2. `rect-index.ts` `refresh` entry — a caller reaches a dirty cache with the controller already closed (`settleDisplacement`'s hooks, then `release.prepare`'s resolve, inside one seam).
3. `rect-index.ts` `refresh` per candidate — the previous iteration's resolver closed it.
4. `spec.ts` `action.effect` after `movePlaceholder` — a custom-element placeholder's connection callback destroys, and `measureInSeam` then walks the candidate list through `visual()`.

**Measured:** reinstating exactly these five readings (site 2 and 3 are two readings in one module) recovers **16 of the 37** failing tests — 37 → 21. That number is the size of the residue, and it is not an impression.

Note what is _not_ in the residue: the geometry read. `visual.getBoundingClientRect()` on a consumer-owned candidate is an overridable platform member, which I-36 (2) already classifies as a **conforming residue**. The bracket makes it genuinely harmless. Retiring it is correct.

### 3.4 The two published ceilings that must be withdrawn

This is the part of A1 with a cost outside the code.

I-36 (3) records **ceilings** — places where the library promises more than the floor, at a named site, enforceably. Two of them do not survive:

- **`§03 §y()/xy()`'s "reads no further geometry"** for the candidate loop, and
- **the README's publication of the same.**

Under the bracket the loop's geometry reads continue after a close. They are harmless, but the promise is that they do not happen. Keeping the promise costs a per-candidate reading in the hottest loop in the library — the exact cost C2-01 accepted and the redesign is trying to remove — and buys a property with no observable consequence.

**Recommendation:** withdraw both, and re-state I-36 (2)'s floor as the whole of the guarantee at that site. The residue in §3.3 is what remains normative.

**Consequence for the contract:** the I-36 stretch/reach analysis is **not retired**. It is _reduced_ — from a quantifier over every consumer-reachable call to a quantifier over **declared consumer slot invocations**, which is a finite, enumerable, mechanically checkable set (`SortableSlots` names them all). That is a large and real improvement, and it is a different claim from §3's.

---

## 4. A3 — exception safety. **HELD.**

Four cases, all observed in the probe suite:

1. `destroy()` requested from `onStart`, then a consumer throw from the same callback — teardown still completes (placeholder removed).
2. The completion token from that `destroy()` still settles.
3. A bare consumer throw with no destroy leaves the bracket **closed**: a later ordinary `destroy()` still tears down synchronously. (`leave()` is in a `finally`; had it not been, `depth` would never return to zero and every later `destroy()` would defer forever — a silent, total failure. This is the single most important line in the primitive.)
4. `openIngress`'s bracket unwinds through its own `finally` — the pre-existing `admitting` reset is now nested inside the bracket's `finally`, so a throw escaping admission clears both.

The pre-existing teardown-totality suite (`kernel.browser.test.ts:2779-2843` — throwing `resetFramePart`, ingress release, report-not-swallow, retirement completing mid-operation) passes **unchanged**.

---

## 5. A4 — the `Promise<void>`. **HELD semantically; changed the model ergonomically.**

**Synchronous in the ordinary case: yes.** Observed _before any `await`_ — `void controller.destroy()` outside library execution removes the placeholder and restores the visual before the next statement. The whole of `kernel.browser.test.ts:2635-2702` (`describe('destroy')` — synchronous presentation/motion release, pointer-capture release, ingress abort, terminal exactly once, teardown after `spec.retire` throws, post-destroy dispatch ignored) passes **unchanged**.

**Deferred in the reentrant case: yes.** From inside `onStart` the placeholder is still present when `destroy()` returns, and gone once the transaction unwinds.

**Settles exactly once: yes**, and the implementation returns the _same Promise object_ for every call, which makes the property structural rather than incidental. Two `.then` handlers on two `destroy()` calls fire once each; the underlying resolver is claimed by the `torndown` latch.

**The cost the summary does not mention.** Changing `destroy(): void` to `destroy(): Promise<void>` makes **46 first-party call sites** violate `typescript(no-floating-promises)` — every one of them a plain `controller.destroy();`. Measured by running `npx just lint tests src` and resolving each reported line back to its source text: 46 of 46 are `destroy()` calls. One of them is `src/sortable.stories.tsx:176`, a React `useEffect` cleanup — i.e. the idiomatic call in the library's own demo.

This is not a blocker, and §3 already writes `void controller.destroy()`. But it is a real, quantified ergonomic tax on every consumer with that rule enabled, and the summary presents the Promise as free. Worth a line in the migration notes and, arguably, worth asking whether the completion token should be a separate member (`destroyed: Promise<void>`) rather than the return value.

---

## 6. A5 — the activation `rollback` (decision S-3). **HELD**, and the plan's claim is half true.

### 6.1 What was built

Modelled on `acquireTopLayer` (`src/kernel/presentation.ts:380-470`), as the decision directs. `createPlaceholder` now returns `{ element, rollback: (() => void) | null }`:

- `rollback` is **`null` for the library's own `<div>`** — dropping the element _is_ the undo, so recording would be pure cost. Pinned.
- For a factory-supplied element, every library-authored mutation registers its undo in an **acquisition ledger** (`PlaceholderAcquisition.undo(step)`), replayed LIFO, each step individually `guarded`.
- The ledger is passed **into** the `placeholder()` feature, so the feature's own `classList.add` is recorded too. That is what makes it all-or-nothing rather than merely mostly.
- `activation.rollback(prepared)` consumes it. The record travels out-of-band in a spec-local slot, exactly as `pendingFailure` does and safe on the same three stated grounds (prepare clears before it writes; every abandoning path leaves it for the next prepare's clear; `refuseReentry` forbids interleaving). This avoids widening `Transition<Part, HTMLElement, …>`'s `Prepared` — **no SPI change was needed for A5.**
- `activation.effect` clears the slot on adoption: from there teardown, not `rollback`, owns the element.
- The refusal path (`placeholder() returned the item / the visual / a connected node`) now **releases before it throws**, so a rejected acquisition also leaves nothing.

### 6.2 The pinned defect is gone — and the plan's split is confirmed

The probe plan (S-3) claimed two things. Both were tested; **one is right and one is only half right.**

> _"the residue exists because `destroy()` physically retires mid-`prepare`. Under deferred teardown, `prepare` runs to completion, the placeholder is adopted, and the existing disposer removes it. The destroy instance of the defect disappears with the mechanism."_

**Half true.** `prepare` does run to completion — but the preparation is **not** adopted: `preparationValid()` is false, so `runCore` takes the `SEAM_INVALIDATED` branch. The disposer at `spec.ts:493-495` is registered in `effect`, which never runs. **Without `rollback` the destroy instance survives deferral**, with `data-drag-placeholder`, `aria-hidden`, `slot`, three inline style properties _and_ the feature's class left on the consumer's element. It is `rollback` that closes it, not deferral. Observed: the three A5 destroy tests fail if `rollback` is removed.

> _"What survives is narrower: the seam being discarded (`preparationValid()` false) or the factory throwing after partial mutation."_

**Right, and now closed.** Pinned for a **cancelling** factory as well as a destroying one; a `cancel()` from inside `placeholder()` holds the latch, the seam is invalidated, and the element comes back clean.

Five cases in the probe suite, all passing: no library attribute, the consumer's own `slot="mine"` preserved, no library class, and the same two for the cancel path including no `style` attribute.

### 6.3 The stated limit

**Attribute serialization order is not recoverable.** An attribute the library removes and then restores is re-appended, so `outerHTML` differs even though the attribute set and every value match. The honest guarantee is _same names, same values_, not _same bytes_. Recorded in the rewritten `tests/sortable/placement.browser.test.ts` rather than papered over.

Two second-order details an implementer will hit: `classList.remove` of the last token leaves `class=""`, and `style.removeProperty` of the last declaration leaves `style=""`. Both need a normalizing undo registered **first** (so LIFO runs it last), conditional on the element not having carried the attribute before acquisition.

---

## 7. A6 — post-release `cancel()` (decision C-2). **HELD**, with one contract discrepancy.

Four cases, all passing, driven through the public entrypoint with a genuinely pending `onReorder` (a hand-held Promise, released after a real gap change so the round-trip is not a proven no-op):

1. **Post-release `cancel()` remains reachable** and produces exactly one terminal callback.
2. **A later settlement of the abandoned resolver produces no second terminal.** The mechanism is the pre-existing `ResolutionAttempt.completed` latch plus `settleResolution`'s triple validation (`attempt.completed`, `resolution !== attempt`, `queue.closed`) — it needed no change under the bracket.
3. **A later _rejection_ of the abandoned resolver produces no unhandled rejection.** Verified with a real `unhandledrejection` listener on `window`, not by inspection. The kernel subscribes with a two-argument `then.call(value, onFulfilled, onRejected)` (`kernel.ts` `openResolution`), so the rejection is always consumed even when the attempt is stale.
4. **Presentation is restored** — the placeholder is gone after the cancel.

**The discrepancy.** The brief specifies the terminal must be **`aborted`** — "after `onReorder` has begun the library cannot claim the reorder did not happen". The implementation terminates as **`canceled`**: `SETTLED_CANCELED` → `OUTCOME_CANCELED` → `domain.type === 'canceled'` → `slots.onCancel` (`src/sortable/spec.ts` settlement `prepare`/`finalized`). The probe deliberately asserts _"exactly one terminal callback"_ rather than which one, so the observation stands independent of the choice.

This is **not** something the bracket decides, and the spike does not change it: `aborted` does not exist in `ReorderTransactionResult` today — §11's five-arm `EndResult` (which introduces `{ type: 'aborted' }`) is a different piece of the redesign. **Recording it as an open item for whoever implements C-2:** the mapping from a post-release cancel to `aborted` is a change to the domain result union and to `finalized`'s exhaustive switch, and it is not covered by any probe in the plan.

---

## 8. Every test that changed meaning, classified

Twenty-one browser tests fail in the floor-preserving variant. **Every one of them lives in a `describe` block literally named "the terminal barrier …".** Nothing outside the I-36 barrier surface broke — not `composition`, not `react`, not `acknowledgement`, not `keyboard`, not `landing-space`, not `assemble`, not `kernel.browser.test.ts`, and not the other 117 tests in `sortable.browser.test.ts`.

### (a) The contract deliberately changing — 21 tests

All 21 assert that a stretch **stops** at a destroy. Under the bracket the stretch completes and its effects are undone at the boundary. Each is listed with what it now does instead.

**`tests/sortable/displacement.browser.test.ts` — 7** (`the terminal barrier in the displacement bracket`, `:1037 :1058 :1078 :1091 :1111 :1131 :1146`) Rows keep being measured and animations keep being started after a destroy. Harmless, and _better_: `retire()` at the boundary now sees a complete `running` map, where the old mid-stack teardown saw a partial one — which is exactly the hazard C5-01's two extra readings were added to patch. The bracket removes the hazard rather than the symptom.

**`tests/sortable/sortable.browser.test.ts` — 7** (`the terminal barrier on the behavior's frame writes`, `:2904 :2925 :2948 :3035 :3069 :3102 :3134`) Draft seeding, `draft.proposal`, `draft.domain`, `rt.pendingRequest` and the destination re-anchor all still happen. Both frames are scrubbed and `pendingRequest` cleared at the boundary; the re-anchored placeholder is removed by the presentation lifetime. Nothing outlives the operation. `onReorder` still cannot fire for a retired operation — that is kernel-owned (`runReleaseSeam` + `staged = preparationValid() ? prepared : null`) and untouched.

**`tests/sortable/xy.browser.test.ts` — 3** (`:757 :783 :849`) and **`tests/sortable/y.browser.test.ts` — 2** (`:459 :485`) The candidate loop's _geometry_ reads and the placeholder anchor read continue, and the cache ends clean-and-full rather than retired-and-empty (`retire()` empties it at the boundary). **These five are the published-ceiling withdrawal of §3.4** — they are the only failures in this class that require a documented contract change rather than merely a re-statement.

**`tests/sortable/features.browser.test.ts` — 2** (`:1320` eager rebuild past a destroying candidate, `:1471` displacement after an `afterMove` measurement destroyed) The destroy is raised _inside_ the loop the residue reading protects, so the reading stops the loop but the `afterMove` pipeline still runs. Animations cancelled at the boundary.

### (b) Spike defects — 2, both found and fixed

- `placement.browser.test.ts` "should complete every mechanics write…" — my expectation listed `slot` as a write; with a `slot`-less item it is a _removal_ and never reaches the recorder. Test corrected.
- `placement.browser.test.ts` "byte-identical after rollback" — asserted `outerHTML`. Surfaced the genuine limit in §6.3; restated as an attribute-map comparison, and produced two real rollback fixes (the empty `class=""` and `style=""` residues).

### (c) Falsifiers firing — 1 group, 3 tests, fixed inside the spike

`sortable.browser.test.ts:793`, `:948`, `:2986` — the **only** failures produced by the bracket alone, before a single liveness reading was removed. They are A2's finding in §2.4: `presentation.signal.aborted` stops being a liveness reading under deferral. Fixed by moving to the logical latch and collapsing two readings to one; all three pass in both committed variants.

### Mechanical, no meaning change

Fixture-shape edits only: `live` removed from / restored on `PresentationView`, `InsertionRuntimeView` and `DisplacementView` literals; `destroy: () => void` → `() => Promise<void>` in hand-written `KernelHost` stubs; `createPlaceholder`'s new return shape in `placement.browser.test.ts`'s `build` helper.

### Node project

`5 failed | 175 passed | 10 skipped` — **identical to baseline**. All five are pre-existing packaging/docs tests that need a build artefact (`tests/consumer.node.test.ts` ×4, `tests/docs.node.test.ts` ×1). The spike adds none, which also means `tests/consumer.node.test.ts:628` — no kernel subpath — is unaffected.

---

## 9. What this probe does not claim

- **No performance result.** The bracket's cost is one increment, one decrement and one branch per drain; it was not measured, and neither was the effect of removing 27 predicate calls from the hot path. `bench/` was not run.
- **It does not validate `items()`/`invalidate()`, the fragment merge, `box()`, or the error taxonomy.** Those are probes B, C and later, and the spike deliberately implements none of them.
- **It does not settle A6's terminal _type_.** It shows the mechanism is safe; `canceled` vs `aborted` is a contract decision left explicitly open in §7.
- **It says nothing about `destroy()` during an asynchronous consumer round-trip** — that is probe C2, which runs after this one.
- **Chromium only**, single browser project.
- **The maximal variant is not a recommendation.** It exists to measure the residue by difference. The floor-preserving variant (`a6d73c40`) is the one whose 27-site figure should be carried into the design.
- **It does not prove `panic()` is unreachable for all time** — only that no current path in `src/` reaches it from behavior or consumer code, and that the bracket's safety at that site depends on the throw having already unwound the stack. A future kernel path that panics _without_ unwinding would need the logical latch exposed to the behavior.

---

## 10. Consequences for the design, in priority order

1. **§3's headline is overstated and should be re-stated.** Not "the liveness set disappears" but: _statement-level liveness disappears; what remains is one boundary revalidation before publication, plus a reading in front of every invocation of a declared consumer slot._ 27 of 33 go. Say 27.
2. **I-36 is reduced, not retired.** Its (2) act 4 survives intact and is now the whole of the obligation. Its quantifier becomes finite: `SortableSlots` names every declared slot, so "does this stretch invoke one?" has a mechanical answer — which is what C4-01 wanted and could not get.
3. **Withdraw the two "reads no further geometry" ceilings** (§03 `y()`/`xy()`, and the README). They cost a per-candidate call in the hottest loop and buy nothing under the bracket.
4. **Write down the reading rule:** once teardown defers, a physical-teardown observation is not a liveness reading. This is the trap that produced the only three failures the bracket caused on its own.
5. **`destroy(): Promise<void>` has a 46-call-site ergonomic tax** in this package alone. Consider a separate `destroyed` token instead.
6. **A5's rollback is required and is not implied by deferral.** The probe plan's S-3 says the destroy instance "disappears on its own"; it does not.
7. **C-2's `aborted` terminal is unimplemented and unprobed.** It needs a change to `ReorderTransactionResult` and `finalized`'s exhaustive switch.