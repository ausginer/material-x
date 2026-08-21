# `drag2` Checkpoint B review

Date: 2026-08-02

Scope: `packages/drag2` at phase 8b, reviewed against [`packages/drag2/.plan/contract/`](../../contract/) 00–06, the Checkpoint B exit criteria in [`plan.md`](../../plan.md), and the M-4 write-up in [`measurements/q7.md`](../../measurements/q7.md).

Read-only review. No package source, test, configuration or contract file was changed. One reversible local experiment (forcing `DEV = false` to price the dev assertions) was run and reverted; the working tree is unchanged.

## Executive summary

The composition model works. Two real features have filled the contribution shape, the assembler's unwind and claim rules behave under real factories, the consumer-declared views held without an import edge back to the behavior runtime, and the five optional features landed with no sibling import edges. The Checkpoint A findings I could re-check (`joinLive` revalidation, the guarded scrub assertion, the `composed` counter in the `arm()` unwind, the single `then` read) are all genuinely fixed rather than papered over. Q-7 is answered with numbers and the answer changed a contract type, which is exactly what the checkpoint ordering was designed to surface.

I found no security issue in the conventional sense — no `innerHTML`, no `eval`, no dynamic code, no network, and consumer-supplied thenables, placeholder elements and landing runners are all handled defensively. The residual risks are local: persistent DOM/style corruption and retention across an idle controller when consumer code fails or mutates at an unlucky boundary.

Nine findings below. None invalidates the composition model, so Checkpoint B can close on its own terms, but **B-01 through B-04 are real defects that are cheaper to fix now than after phase 9 freezes the surface**, and **B-03 and B-05 are composition-model questions, which is precisely what this checkpoint is for**.

### Overall assessment

| Layer | Assessment | Main reason |
| --- | --- | --- |
| Correctness / contract | **Good, with four real defects** | The lifecycle machine holds up under adversarial reading; the defects are at the edges the contract delegates to behavior discipline (B-01, B-02, B-04) plus one cross-feature geometry interaction (B-03). |
| Performance | **Sound design, two concrete costs, still unmeasured** | The move path allocates one string per sample as promised, but costs ~7 indirect calls where the contract counts 3 (B-11), and the axis feature forces one uncached layout read per frame (B-10). M-1/M-2 remain owed. |
| Bundle size | **Credible, but the minimal build is the weak number** | Complete = 11.47 kB brotli, level with the shipped combined build (11.30 kB). Minimal = 10.26 kB, **47% larger than the shipped feature-complete `sortable.js` (6.98 kB)**. Optional-feature deltas are excellent (0.4–0.5 kB each); the weight is in the always-present layer. |
| Maintainability | **Best-in-repo commentary, one structural concentration** | `kernel.ts` is 1,915 lines in a single closure over ~35 mutually visible bindings whose consistency rules are prose-enforced. The README is stale, and the phase-8b deviation ledger is empty while at least three deviations landed. |

## Verification performed

- `npx just typecheck` — clean.
- `npx just test` — **22 files, 518 tests passed, no type errors**, 4.3 s.
- `npx just build` — clean, 84 files.
- `npx just size` — real numbers, reported under [Bundle size](#bundle-size).
- Shipped `@ydinjs/drag` size measured for the migration baseline.
- Full read of every module in `src/`, the contract set, and the M-4 write-up.

The green suite is strong evidence for what it covers. It does not cover B-01, B-02 or B-03, and could not: two of them need a consumer that mutates at a specific settlement boundary, and one needs the two geometry features driven together.

---

## Correctness and contract findings

### B-01 — Moderate: the seam driver's `staged` slot is never cleared by retirement or `destroy()`

**Evidence.** [`seams.ts:261`](../../../src/kernel/seams.ts#L261) declares `let staged: unknown = null`. It is written at [`seams.ts:403`](../../../src/kernel/seams.ts#L403) after **every** committed transition, and cleared in exactly two places: the top of the next `runCore` ([`seams.ts:369`](../../../src/kernel/seams.ts#L369)) and `consumeStaged()` ([`seams.ts:417-421`](../../../src/kernel/seams.ts#L417-L421)), whose only caller is `runReleaseSeam`.

`runActivationSeam` stages an `HTMLElement` — the placeholder — and nobody consumes it. `openSettlement` and `handleFailed` stage a `PreparedSettlement` carrying the consumer's `presentationReady` promise, and nobody consumes that either. Neither `retireOperation` nor `destroy()` ([`kernel.ts:410-471`](../../../src/kernel/kernel.ts#L410-L471)) touches the slot.

**Reproduction.** `onStart` calls `controller.destroy()`. Teardown runs to completion: the queue is cleared, attempts retired, lifetimes disposed, both frames scrubbed, ingress aborted. Control then returns into `runCore`, whose `effect` phase completed normally, and line 403 assigns the placeholder element to `staged` — _after_ `destroy()` returned. It stays there for the life of the kernel closure.

The non-destroy case is milder but universal: after every normal drop the driver retains that drag's `PreparedSettlement`, and with it the consumer's readiness promise, until the controller's next `runCore`.

**Contract impact.** I-20 — "an idle controller retains no DOM from a completed drag". Contract 05 rates the _outcome_ tier C because it depends on `resetFramePart` exhaustiveness, but this is a **kernel-owned slot**, so it is the tier-B half that the kernel is supposed to guarantee. The `__DEV__` reset heuristic (`assertFrameScrubbed`) cannot catch it: it inspects the two frames only.

**Recommendation.** Call `driver.consumeStaged()` from `retireOperation` and `destroy()`, or have `runActivationSeam` consume its staged element the way `runReleaseSeam` does. Test: activate, `destroy()` from `onStart`, assert the placeholder is not reachable (a `WeakRef` probe, or simply assert `driver.consumeStaged() === null` through the seam harness the driver tests already build).

---

### B-02 — Moderate: the `RECOVERY_HOME` re-anchor has none of the Q-12 guards the destination re-anchor has

**Evidence.** [`sortable/spec.ts:714-751`](../../../src/sortable/spec.ts#L714-L751). The `RECOVERY_DESTINATION` branch carries all three conjuncts the contract specifies, with a comment explaining why each earns its place:

```ts
if (
  item.isConnected &&
  item.parentElement === placeholder.parentElement &&
  placeholder.nextElementSibling !== item
) {
  item.before(placeholder);
}
```

The `RECOVERY_HOME` branch is `homeGap(current)` ([`spec.ts:161-167`](../../../src/sortable/spec.ts#L161-L167)), which calls `movePlaceholder(rt.placeholder!, home)` — and `movePlaceholder` ([`placement.ts:140-157`](../../../src/sortable/placement.ts#L140-L157)) does `after.before(placeholder)` / `before.after(placeholder)` with no connectivity or parentage check at all. Only the inertness half (`placeholderAt`) is shared.

**Failure modes.** Home recovery is reached by _rejected_, _canceled_ and most _failed_ settlements — i.e. exactly the moments a consumer is most likely to be mutating its list in response to the rejection.

- Home neighbour **reparented** into another container: `after.before(placeholder)` moves the library's placeholder into the consumer's other tree, `anchorTarget` then measures it there, and the authoritative pin sends the lifted visual to a viewport point in the wrong container. Presentation release removes the placeholder from that foreign tree, so the corruption is transient — the wrong landing position is not.
- Home neighbour **detached**: `Node.before()` on a parentless node is a spec no-op, so the placeholder silently stays where it is. That is the _same_ degraded outcome the destination branch chooses deliberately, but reached by accident, with no diagnostic and no comment saying it is intended.

**Contract impact.** Contract 02 §recovery table says home "returns the placeholder there before measuring"; contract 03 §`placeholder()` states the guarded form only for the semantic anchor and Q-12 frames the hazard around the dragged item. The hazard is identical for the home neighbours, and the code already knows how to defend against it forty lines above.

**Recommendation.** Either give `homeGap` the same guard, or — better, since it fixes the class rather than the instance — make `movePlaceholder` refuse an anchor whose `parentElement !== placeholder.parentElement`, returning `false`. That also covers the release path (`release.effect` calls `movePlaceholder` unconditionally). Test: reject a reorder while the consumer moves the home neighbour into a second list, and assert the placeholder never leaves its container.

---

### B-03 — Moderate: `vertical()` caches FLIP-transformed geometry and then freezes it

This is the composition-model finding, and the reason Checkpoint B exists.

**Evidence.** The committed-move bracket in [`sortable/spec.ts:462-482`](../../../src/sortable/spec.ts#L462-L482) runs in this order:

```
view.insertion = insertion
beforeMove hooks      → layoutAnimation measures the span
movePlaceholder       → the DOM write
invalidateInSeam()    → vertical marks its index dirty
afterMove hooks       → layoutAnimation starts 160 ms translateY animations
```

`vertical()`'s `refresh` ([`vertical.ts:88-129`](../../src/sortable/vertical.ts#L88-L129)) then rebuilds **lazily**, on the next spatial frame — which q7.md §Answer 2 states explicitly as a reason no shared read phase is needed. That next frame is roughly one rAF later, i.e. _inside_ the 160 ms displacement window. `refresh` reads `getBoundingClientRect()`, which includes each row's in-flight `translateY`, and then sets `dirty = false` and `measured = snapshot.version`.

Nothing invalidates when the animations finish — `layoutAnimation` has no capability to say so, and `vertical` has no reason to look. So the index holds mid-animation centres until the _next_ committed move, scroll, resize or collection publication.

**Consequence.** The nearest-centre rule compares a freshly measured placeholder centre (`centreOf(placeholder)`, read live every frame) against item centres that can be up to a full row-height stale, for the remainder of the drag if the pointer settles. I-15 — "the insertion rule cannot oscillate… nothing to mistune into oscillation" — is stated for settled geometry. With `layoutAnimation()` installed it is being evaluated against animating geometry, and the two features were designed and measured independently.

**Why it was not caught.** q7.md correctly identifies the lazy rebuild and correctly concludes there is no _duplicate read_ to share. It does not consider _when_ the lazy rebuild lands relative to the animations the same bracket just started. And the test suite has thorough coverage of each feature alone (`features.browser.test.ts` has 9 `layoutAnimation` cases and 12 `vertical` cases across suites) but no case that drives gap selection with both installed.

**Recommendation.** Pick one, and write the reason down:

1. **Have `vertical()` read untransformed geometry.** `@ydinjs/box-quad` already produces the untransformed border-box during the traversal `acquireLift` uses, so the primitive exists. Correct under any displacement feature, and it also makes the axis rule independent of anything else writing transforms.
2. **Refresh eagerly, between the write and `afterMove`.** One line, geometry is settled, and it costs the full-list read at a moment q7 already priced (0.675 ms at 800 rows) — but it moves that cost from the frame _after_ the move onto the move itself, which is the worse frame to load.
3. **Accept it and say so**, on the grounds that matching what the user _sees_ is defensible. If so, I-15's non-oscillation claim needs the qualifier.

Whichever is chosen, add a `vertical() + layoutAnimation()` gap-selection test.

---

### B-04 — Low/Moderate: `captureInlineStyles` destroys authored inline longhands

**Evidence.** [`presentation.ts:45-107`](../../../src/kernel/presentation.ts#L45-L107). `LIFTED_PROPS` contains the shorthands `inset`, `margin`, `padding`, `border-width`, `border-style`, `border-color` and `overflow`. Capture is `style.getPropertyValue(prop)`; restore is `setProperty` when a value was captured and `removeProperty(prop)` when it was not.

CSSOM returns `''` from `getPropertyValue` on a shorthand unless every longhand is set and reconstructible, and `removeProperty` on a shorthand removes **all** its longhands.

**Reproduction.** `<li style="margin-left: 12px">`. Capture records nothing for `margin` (only one longhand is set). The lift writes `visual.style.margin = '0'` in `neutralizeUA`. Teardown calls `removeProperty('margin')`, which removes `margin-left` too. The authored inline style is gone permanently, after one drag.

The same holds for `right`/`bottom` (removed by the `inset` clear, while `top` and `left` are separately captured and restored), `padding-*`, `border-*-width|style|color`, and `overflow-x|y`.

**Contract impact.** I-7's "styles restore exactly once" is satisfied literally — they restore once, but not to what was there. `packages/drag2/tests/kernel/presentation.browser.test.ts` covers restoration of properties the lift sets, not of authored longhands it never set.

**Recommendation.** Expand `LIFTED_PROPS` to longhands (the list is module-constant, so this costs nothing at runtime), or capture `visual.getAttribute('style')` and restore it wholesale. The longhand expansion is safer: a wholesale restore would also clobber writes made by consumer code during the drag. Test: an item with a single authored inline longhand of each shorthand, dragged and dropped, asserting the attribute is byte-identical.

---

### B-05 — Low: three action tags, and an empty phase-8b deviation ledger

**Evidence.** [`runtime.ts:23-31`](../../../src/sortable/runtime.ts#L23-L31) declares `TAG_INVALIDATION = 2` and `SORTABLE_ACTION_TAGS = 3`. Contract 02 §`ActionTransition`: _"Vertical sortable needs **two** tags … so it declares `config.actionTags: 2`."_ Contract 05 Q-4: _"A third or fourth is a **signal worth investigating**."_

The mechanism itself is well argued in the comment at [`spec.ts:279-292`](../../../src/sortable/spec.ts#L279-L292): a native scroll/resize listener is not a seam, so a `host.fail` from it would be downgraded to a platform report and `FAILURE_INVALIDATION` would have no producer at all. Routing it through an action gives it a seam. That is sound.

What is missing is the record. `plan.md` documents deviations meticulously for every phase through 8a; **phase 8b has no "Deviations recorded while implementing" section**, while at least three landed:

1. `TAG_INVALIDATION`, the third action tag, against a contract that names two.
2. `DisplacementView.insertion`, a change to a contributed view shape, recorded only in `q7.md` §Answer 1 and not in the plan's ledger.
3. `landing()`'s `duration: 0` path completes through a WAAPI microtask, not synchronously — so the "synchronous `done()` from inside `start`" case the contract makes safe is exercised only by a custom `run`, never by the shipped runner. That is fine, but contract 03 §`landing()`'s wording ("also immediate, but not the same code path") reads as though it were synchronous.

Checkpoint B's stated purpose is to catch composition-model changes before optional features multiply the cost of changing them. The ledger is the mechanism, and the hole is exactly where the checkpoint looks.

**Recommendation.** Add the phase-8b deviation section, and answer Q-4 in writing — either "three tags is the number, and here is why the third is a transport rather than a semantic action", or introduce the thing actually missing: a kernel channel for classifying a failure raised outside a seam against a validated operation.

---

### B-06 — Low: the public surface leaks the internal SPI through `drag.js`

**Evidence.** [`drag.ts:10-18`](../../../src/drag.ts#L10-L18) re-exports `ActivationScope`, `Behavior`, `BehaviorInstall`, `BehaviorSpec`, `KernelHost`, `ResolutionCommand` and `SeamRejection`. Contract 03 §The public/internal boundary lists all of those except `Behavior` as **"Internal and unstable — not exported, and free to change without notice."** The emitted `drag.d.ts` (1.20 kB) plus the `kernel/spec.d.ts` it pulls in (11.32 kB) ship the whole authoring surface.

The inverse also holds: the types the export table _requires_ on `drag.js` — `Point`, `DragErrorContext`, `FailureStage`, `DOMRealm` — are not exported from it. `FailureStage` is reachable only through `sortable.js`'s `CancelStage` sibling, and `DragErrorContext` is not reachable from any entry, so a consumer cannot type its own `onError` handler.

Sharpening: `consumer.node.test.ts` says it is _"the only one that would catch … an internal SPI type becoming reachable through a public entry"_, and its fixture proves that for exactly one identifier (`BehaviorFactory`, line 105). The six above pass through unchallenged. `should declare no subpath into the kernel` checks export _keys_, not re-exported types.

**Contract impact.** Phase 9 owns freezing this, so it is on schedule rather than overdue — but D-30's whole argument is that "public stable type whose structure is internal and unstable" is not a coherent state, and that is the state `drag.js` is currently in.

**Recommendation.** When phase 9 lands, extend the consumer fixture to a generated `@ts-expect-error` line per internal identifier rather than one hand-written case, so the guard cannot drift again.

---

### B-07 — Low: `config.readinessTimeout` is hardcoded and unreachable

**Evidence.** [`sortable/spec.ts:173-178`](../../../src/sortable/spec.ts#L173-L178) sets `readinessTimeout: 500` as a literal. Contract 02 calls 500 the _default_, which implies configurability; `callbacks()` is the sole consumer surface and does not expose it, and no other feature does either.

**Consequence.** A consumer whose authored commit legitimately exceeds 500 ms — a large React tree, a slow device, a suspended boundary — gets `FAILURE_PRESENTATION_READY`: the settlement is replaced, presentation is released through the failure path, `onError` fires and **no `onFinish` ever does**, for a drop the consumer accepted and did apply. There is no way to opt out or extend.

Same shape, lower stakes: `liftMode: LIFT_FLAT` is hardcoded, so `LIFT_FAITHFUL` and `LIFT_IN_PLACE` are unreachable through any public surface while still shipping (see B-13).

**Recommendation.** Add `readinessTimeout?: number` to `SortableCallbacks` alongside `threshold`, which is already normalized there and is the contract's own precedent for "one consumer-facing place". Also worth validating both: `assemble` currently accepts `threshold: NaN`, which makes `dx*dx + dy*dy >= threshold*threshold` permanently false and silently disables activation.

---

### B-08 — Low: admission is O(path × items) inside native `pointerdown`

**Evidence.** [`sortable/spec.ts:188-196`](../../../src/sortable/spec.ts#L188-L196):

```ts
for (const node of path) {
  if (snapshot.items.includes(node as HTMLElement)) { … }
}
```

`composedPath()` returns the full ancestor chain including the document and window. For an 800-row list nested 15 deep that is up to ~12,000 identity comparisons inside the native handler, before `preventDefault()` runs.

`copyUniqueItems` ([`collection.ts:41-53`](../../../src/sortable/collection.ts#L41-L53)) already builds a `Set` of exactly these elements to validate uniqueness — and throws it away.

**Recommendation.** Keep the `Set` on the snapshot (or beside it on `rt`), built once per `updateItems`. Turns admission into O(path). Costs one retained `Set` per published collection, which is the same retention the `items` array already has.

---

### B-09 — Note: `activate()` has no guard against a second lift acquisition

**Evidence.** [`kernel.ts:700-751`](../../../src/kernel/kernel.ts#L700-L751). `acquireActivation` acquires the origin rect, the lift and pointer capture, and `handleMove` calls `activate()` whenever `phase === PENDING` and the threshold is crossed. There is no `lift === null` precondition.

Today this is unreachable: every path that leaves the phase at `PENDING` after a failed activation queues either a `FAILED` checkpoint or a `CANCEL`, both of which drain before any subsequent native `pointermove` can arrive. I traced all four `failOperation` downgrade conditions and none is satisfiable at `PENDING` during activation.

It is recorded because it is a one-line guard protecting against a nasty outcome: a second `acquireLift` would capture the _lifted_ styles as "authored" and stack a second disposer on the presentation lifetime, permanently corrupting the visual's inline style. The invariant that saves it lives in `failOperation`, three hundred lines away.

---

## Performance

The design is right. The move path allocates exactly one transform string per sample, `runMoved` is correctly hoisted to one controller-stable closure with a comment explaining why, the queue is two parallel arrays with no per-entry object, `FrameTask.schedule` holds its value with a presence flag rather than a wrapper, and `compose` is allocation-free in every lift mode including in-place — which is a genuine improvement over the shipped package that F-24 called out.

Two concrete costs, both of which M-1 needs to account for rather than rediscover.

### B-10 — Moderate: the incumbent anchor is the one geometry read that is never cached

**Evidence.** [`vertical.ts:147`](../../src/sortable/vertical.ts#L147):

```ts
const anchor = centreOf(placeholder); // getBoundingClientRect()
```

This runs on **every** `resolve`, i.e. every animation frame while dragging, even when `refresh` short-circuited because the index is clean and nothing moved. The whole point of the packed index is that "on a frame where the pointer merely travels inside the same slot this reads no geometry at all" — and then the very next line reads geometry.

The placeholder's _layout_ position changes only on the events that already dirty the index: a committed move, scroll, resize, collection publication. It is exactly as cacheable as the rows, and it is the only one that is not.

**Recommendation.** Measure the placeholder inside `refresh` and store its centre alongside the packed rows. One extra `Float64` and one fewer forced style/layout flush per frame. (Note the interaction with B-03: if `vertical()` moves to untransformed geometry, the placeholder must too, and it is not animated, so either basis works for it.)

### B-11 — Moderate: the hot path costs ~7 indirect calls, not the 3 the contract counts

Contract 00 and 06 both account for **three** post-`MOVE` indirect calls — `spec.moved`, `lift.composeXY`, `frame.schedule` — and I-26 is stated against that. The implemented path is:

```
handle → handleMove → driver.runLeaf → runPhase → runMoved
       → spec.moved → lift.write → compose
       (+ rt.frame.schedule)
```

`runPhase` additionally performs a re-entry check, two latch writes, a `try/catch` and two post-checks per sample.

**None of this is a defect.** The wrapper is mandated by F-40 (without it a CSSOM throw becomes a panic), `runMoved` is already hoisted, and `write` delegating to `compose` is the session's own API. The finding is that the contract's headline number is now wrong by more than a factor of two, and M-1's "generic frame copy vs specialized path" framing is aimed at the wrong cost — the frame copy is one `Object.assign`; the call chain is seven frames plus exception-handling setup.

**Recommendation.** Restate I-26 and the contract 06 accounting against the implemented path before M-1 runs, so the measurement compares the right things. If the driver overhead does show up, the narrow fix is a `runLeafFast` that skips the re-entry check for `moved` specifically — the one seam that cannot be reached reentrantly, because it dispatches nothing.

### B-12 — Note: one full frame copy per rAF, not per committed move

`runCore` calls `context.begin()` before `prepare`, so a spatial frame where the placeholder is still the nearest candidate — the common case while the pointer travels inside one slot — pays a 15-field `Object.assign` and returns `SEAM_DISCARDED`. That is deliberate and correct ("paying it uniformly keeps 'a discarded action touched nothing' true"), but contract 02's framing counts _one extra copy per `pointerup`_, which understates the steady-state rate by roughly 60×. Recorded as an M-1/M-2 input.

### B-13 — Note: unreachable runtime shipped

- `FrameTask.flush()` ([`invalidation.ts:80-86`](../../../src/kernel/invalidation.ts#L80-L86)) has no caller in `src/` or `tests/`.
- `Lifetime.finalized` ([`lifetimes.ts:28`, `54-56`](../../../src/kernel/lifetimes.ts#L54-L56)) has no reader; it costs an accessor on three objects per operation.
- `seamFailed` ([`seams.ts:112`](../../../src/kernel/seams.ts#L112)) is used only by tests.
- `LIFT_FAITHFUL` and `LIFT_IN_PLACE` are unreachable from the sortable composition (B-07), but `acquireLift` branches on a runtime value, so `inPlaceProjection`, the faithful matrix path and the ancestor-basis constants cannot be shaken out of the minimal build.

---

## Bundle size

Measured now, rolldown + brotli, `npx just size`:

| Composition                   | drag2        | Δ vs minimal |
| ----------------------------- | ------------ | ------------ |
| minimal                       | **10.26 kB** | —            |
| minimal + `layoutAnimation()` | 10.78 kB     | +0.52 kB     |
| minimal + `landing()`         | 10.65 kB     | +0.39 kB     |
| complete                      | **11.47 kB** | +1.21 kB     |

Shipped `@ydinjs/drag`, same harness: `draggable.js` 5.79 kB, `sortable.js` **6.98 kB**, combined 11.30 kB.

**The good result.** The optional-feature deltas are small and roughly proportional to what each feature does. That is the composition model working, and it is the number Checkpoint B asked for. The _complete_ drag2 build (11.47 kB) is level with the shipped combined build (11.30 kB) while being a strict superset in rigor.

**The weak result.** The **minimal** composition — vertical sortable with no optional feature — is **47% larger than the shipped, feature-complete `sortable.js`**. Fewer features, more bytes. The weight is entirely in the always-present layer: the seam driver, `validateFramePart`, the settlement machinery, the assembler plumbing, and the diagnostics.

**Caveat, stated so this number is not over-read.** These are unions of built entry files, not the M-3 consumer fixtures. They _bound_ the real figure from above — a fixture cannot be larger — but they do not prove the tree-shaking claim, and the shipped `sortable.js` is not feature-matched, so this is the migration-context baseline contract 05 says must be reported separately from the composition-cost baseline. Both are still owed.

### The `DEV` strip, priced

Contract 04 asks that the dev assertions "compile out of production"; `dev.ts` resolves `DEV` at runtime from `process.env.NODE_ENV`, which is **`true` in every browser** (`typeof process === 'undefined'` → `true`), and the plan defers the `define` mechanism to M-3 "where the cost of carrying the assertions becomes visible".

It is visible now. Forcing `DEV = false` and rebuilding:

| Composition | `DEV = true` | `DEV = false` | Saving         |
| ----------- | ------------ | ------------- | -------------- |
| minimal     | 10.26 kB     | 9.97 kB       | 0.29 kB (2.8%) |
| complete    | 11.47 kB     | 11.17 kB      | 0.30 kB (2.6%) |

**So the bytes are not the argument — the runtime is.** Every consumer in every browser today runs `Object.keys` + a per-key descriptor validation + a full-field object scan on each frame scrub, twice per operation retirement, plus `assertFrameShapesMatch` at `arm()`. At 0.3 kB, the decision does not need M-3: add the build-time `define` in phase 9 and stop shipping the assertions.

### Other contributors worth naming for M-3

- Two unreachable lift modes (B-13), which a runtime branch protects from shaking.
- ~40 distinct diagnostic message literals. They compress well and they are the reason the code is debuggable, but they are the largest single category of non-code bytes, and several are long enough to be worth shortening (`'drag: the ingress root left the document before activation; pointer capture cannot be acquired'`).

---

## Maintainability

**What is genuinely excellent**, and I want to be specific because it is unusual: every non-obvious branch in this package cites the finding it closes and explains the counterfactual. A new contributor reading `kernel.ts:539-548` learns not just that a held cancel latch suppresses a checkpoint but the exact two-callback sequence that would otherwise deliver both `onCancel` and `onError` for one operation. `seams.ts:300-312` states the phase order as a contract — _refuse, close, panic, classify_ — and explains why the panic cannot live inside the `catch` that classifies. Comments like these are what make an 1,900-line state machine reviewable at all, and several of my candidate findings were dissolved by reading them.

Four concerns.

### 1. `kernel.ts` is one closure over ~35 mutually visible bindings

1,915 lines, and every handler can read and write every binding. The rules that keep them consistent are prose-enforced and pairwise:

- `armedStamp` → `stamp` handover (`begin` takes and clears, `commit` consumes, `runStamped` clears in a `finally` for the window `begin` cannot cover);
- `pinned` vs `current.operation` (the whole meaning of `preparationValid`);
- `reporting` vs `current.phase === REPORTING` (one spans the prepare, the other starts at the commit — and one of the two tests is documented as unreachable today and kept for a future async `ERROR_REPORTED`);
- `settlement` (the slot) vs `attempt.completed` vs `attempt.failed` vs `attempt.sealed`, four latches with overlapping meanings, two of which the code itself flags as "redundant with a second mechanism".

Each individually is justified. Together they are the single largest onboarding cost in the package, and keyboard sorting — which the contract says will _revise_ the kernel contract rather than be worked around — lands on top of them.

**Concrete, low-risk suggestion.** The settlement machinery (`createSettlementAttempt` … `openSettlement`, roughly `kernel.ts:831-1334`) is separable. It reads `spec`, `driver`, `lifetimes`, `lift`, `originRect`, `visual`, `current`, `realm` and `dispatchKernel` — all of which could be one explicit context object built once per controller, exactly as `SeamContext` already is for the driver. That moves ~500 lines and four latches into a module with a stated surface, and the precedent for it is already in the codebase.

### 2. `pendingFailure` is the eighth field of a "seven-field runtime"

[`sortable/spec.ts:133`](../../../src/sortable/spec.ts#L133) is a per-controller closure binding — not a module global, and the 25-line comment defending it is correct: `prepare` clears on entry, so a value can only be read by the effect of the transaction that wrote it, and `refuseReentry` forbids interleaving.

The maintainability cost is not safety, it is _discoverability_. `SortableRuntime` is documented as the complete inventory of the behavior's mutable state, and this is mutable behavior state that is not on it. A reader auditing "what does this behavior carry between seams" will read `runtime.ts` and get a wrong answer. Moving it onto `rt` changes nothing about the safety argument and makes the inventory true.

### 3. The README is stale, and it is the first file a contributor opens

[`README.md`](../../../README.md) §Status says "Phases 0–6 complete", "`assemble()` is phase 7 and the feature modules are phase 8, so `sortable(items, ...features)` does not exist yet", and "`src/sortable.ts` is still a stub". All three are false. `sortable()` is the documented public entry, all eight subpaths ship runtime code, and the deliberate-differences list is missing everything 7–8b added.

### 4. Traceability

518 passing tests with excellent adversarial coverage — the settlement mapping, terminal protocol, landing completion latch, teardown totality and explicit failure latching groups are all represented, and I-9 is verified at both the kernel and composed layers. What is missing is the map from matrix row → test → invariant, which phase 10 owes. Two specific gaps I would pull forward because they are _composition_ questions rather than closure questions:

- `vertical()` + `layoutAnimation()` driven together for gap selection (B-03);
- the home re-anchor against a consumer that reparents (B-02).

---

## Checkpoint B exit questions, answered directly

| Question | Answer |
| --- | --- |
| Does the contribution/slot shape and the flattened geometry pair hold with two real features? (D-19, D-12) | **Yes.** `InsertionGeometry`'s resolve/invalidate/retire triple is the right unit — `vertical()` genuinely cannot work without the behavior owning invalidation, and the flattening keeps the call site at one property read. One shape change was needed and is justified: `DisplacementView.insertion` (M-4). `SortableContribution` itself is unchanged. |
| Does the assembler's unwind, claim diagnostics and normalization hold under real factories? | **Yes.** Cleanup-before-claim is implemented correctly and the duplicate-axis case does clean the rejected contribution's state; the single `reverse()` is right; `onStart` normalization vs nullable terminal callbacks is the right split. One gap: no validation of `threshold` (B-07). |
| Did the consumer-declared view types hold without an import edge back to the behavior runtime? (D-13, D-20) | **Yes**, and the import graph confirms it — `vertical.ts` and `layout-animation.ts` import only `domain.ts`/`feature.ts`/`slots.ts` types. Two widenings were needed: `InsertionFrameView.item` (recorded in 8a) and `DisplacementView.insertion` (recorded only in q7.md — see B-05). |
| The minimal build's module graph and first size reading | **Measured**: 10.26 kB brotli minimal, 11.47 kB complete, deltas of 0.39–0.52 kB per optional feature. The graph is clean — the packed fixture proves no subpath reaches the kernel and every declared entry ships runtime code. The concerning number is minimal vs the shipped `sortable.js`, not the optional deltas. |
| Gate semantics observed rather than reasoned about: readiness held with no landing feature | **Verified.** `composition.browser.test.ts:405` and `kernel.browser.test.ts:1313` both assert I-9 from opposite directions, and `sortable.browser.test.ts:1201` covers the immediate-recovery case where the landing feature _is_ installed but no hold is requested. |

**Recommended exit.** Close Checkpoint B on the composition model — it held. Fix B-01, B-02 and B-04 before phase 9 (all three are contained, and B-01 in particular gets harder to reason about once more seams stage values). Decide B-03 explicitly, because it is the one finding that is genuinely about two features interacting and therefore belongs to this checkpoint rather than the next. Fill the phase-8b deviation ledger (B-05) and refresh the README before either is used as a baseline for phase 9.