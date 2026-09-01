# D-155's relinquished tail — feature proof

**Feature-proof pass, phase 24.** Files read at `37ae30e6`; diff range `09f26770..37ae30e6` (one commit, _drag2: replace the landing gate with a relinquished tail_). Working tree clean at that commit; nothing was modified except this report.

The question is not whether the tree spells D-155's vocabulary but whether the shipped control flow delivers what D-155 requires. Every claim below cites the line that makes it true, and where a property could be violated, the path that would violate it.

## 0. Verification run

`npx vitest run -c vitest.config.ts` at `37ae30e6`: **65 files, 1225 passed, 60 skipped, no type errors**. Every skip is a `tests/perf/*` measurement suite (`M-1`, `M-1'`, `M-2`, `M-2′`, `M-5`, `M-6`, `P-01`, `P-02`, `Q-7`); no behavioural row is skipped, and `grep` finds no `it.skip`/`describe.skip` anywhere under `tests/`.

## 1. Scope

**Covered.** The eight load-bearing claims in §2, traced through `src/kernel/kernel.ts`, `src/kernel/spec.ts`, `src/kernel/presentation.ts`, `src/kernel/lifetimes.ts`, `src/kernel/unwind.ts`, `src/kernel/failures.ts`, `src/shared/landing.ts`, `src/shared/composition.ts`, both `*/landing.ts`, both `*/spec.ts` `landingTail` members, `src/sortable/layout-animation.ts`; the full `src/` delta of the commit; the tail rows in `tests/kernel/kernel.browser.test.ts` and the landing rows in `tests/sortable/features.browser.test.ts`; the deleted `src/shared/landing-runner.ts` and the deleted `LandingContext` at `09f26770`, member by member, for §2.8.

**Not covered.** The size figures D-155 records (a measurement pass owns `bench/size`); the `.plan/contract/` rewrite as a whole — only the four rows that state a runtime fact about the tail were read, and two of them are findings; free drag's `accept()` commit obligation, which D-155 leaves open; F-203; sortable geometry outside the landing target (`landing-space.browser.test.ts` was read for its declines, not audited); visual/rendering verification in a real browser beyond what the suite asserts.

## 2. The eight claims

### 2.1 No runner-shaped seam survives at any tier — **holds**

`LandingTail` is declared once, at `src/kernel/spec.ts:330-333`, and carries exactly `{ duration: number; easing: string }`. Nothing else. `BehaviorSpec.landingTail` (`spec.ts:447-453`) is the only member that produces one; the middle-tier contribution's one member is `landingTiming: LandingTiming` (`src/shared/composition.ts:88-92`), whose signature is four scalars in, `LandingTail | null` out (`composition.ts:70-75`). `sortable/feature.ts:62-66` and `free-drag/feature.ts:46-53` re-export that single declaration rather than restating it.

A grep of `src/` for `holdForLanding`, `LandingHandle`, `LandingStart`, `LandingContext`, `LandingRunner` and `landing-runner` returns **nothing**. `FAILURE_LANDING_CREATE` and `FAILURE_LANDING_INTERRUPTED` are deleted from `src/kernel/failures.ts` and from `FailureStage`, leaving 10-13 as holes; `LANDING_SETTLED` is gone from `src/kernel/actions.ts`, leaving tags 6 and 7 unused. No phase machine, completion callback or `RUNNING`/`DONE`/`ABORTED` enum is reconstructed anywhere: the kernel's whole record of the tail is one nullable slot, `let tail: Animation | null` (`kernel.ts:547`), and one function that ends it (`cancelTail`, `kernel.ts:560-569`). The remaining occurrences of the old vocabulary are in `tests/probes/*`, `tests/revision/*` and `tests/COVERAGE.md`, which are historical records; `tests/probes/13b-settlement.ts:187` re-declares `holdForLanding` **locally** rather than importing it, so it does not pin a live type.

### 2.2 Presentation is completely released before any tail starts — **holds**

The sequence in `joinSettlement` (`kernel.ts:1580-1673`) is:

1. `begin(); draft.phase = FINALIZING; commit();` — 1584-1586
2. `joinLive()` re-entry check — 1599
3. sample `session.rendered` into `fromX`/`fromY` — 1615 (destructured, so a copy of the mutable point)
4. the pin, `session.write(targetX, targetY)` under `runLeaf(..., FAILURE_RENDERER_WRITE)` — 1617-1623
5. **`owned.presentation.dispose()` in a `finally`** — 1631
6. `startTail(...)` — 1657
7. `joinLive()` again, then `spec.finalized(current)` — 1662-1668

Step 5 is unconditional and precedes step 6 textually and dynamically; there is no interleaving and no partial release. What it releases is the whole presentation lifetime, LIFO (`lifetimes.ts:96-107`): the kernel registered `session.dispose` at `kernel.ts:1243`, and the sortable registered `placeholder.remove()` at `sortable/spec.ts:787-789` during `activation.effect`, which runs later — so LIFO removes the placeholder first, then disposes the lift, whose disposer exits the top layer and then restores the inline styles in a `finally` (`presentation.ts:601-611`). Styles restored, top layer exited, placeholder removed, then the animation. Free drag registers nothing on that scope, so its release is the lift alone.

The path that would violate it — starting the animation while the visual is still `fixed` in the top layer — is pinned executably by _should start only after presentation is released_ (`tests/kernel/kernel.browser.test.ts:2009-2034`), which reads `scope.visual.getAnimations().length` **from inside a presentation disposer** and asserts `0`, then asserts a tail exists afterwards.

### 2.3 The terminal no longer waits for pixels — **holds**

`startTail` is synchronous and returns `void` (`kernel.ts:1505-1565`). Nothing subscribes to `Animation.finished`, `Animation.ready` or any promise derived from the tail: the only `.finished` subscription left in `src/` is `sortable/layout-animation.ts:207`, which belongs to the displacement feature. `spec.finalized` is called on the next statement (`kernel.ts:1666-1668`) and `RETIRE` is dispatched immediately after (1672). `retireAttempts` deliberately does **not** touch the tail (`kernel.ts:451-459`), so retirement neither waits for it nor ends it.

`destroy()` does not wait either: `runPhysicalTeardown`'s `finally` calls `cancelTail()` and then settles the destroyed promise (`kernel.ts:600-614`). _should finalize in the same drain with a tail installed_ (`kernel.browser.test.ts:1890-1901`) and _should cancel the tail when the controller is destroyed_ (2055-2075, asserting `playState === 'idle'`) pin both halves.

### 2.4 No lease and no inline-style ownership — **holds**

The animation is built with `composite: 'add'` and **no `fill`** (`kernel.ts:1545-1564`), so it defaults to `fill: 'none'` and writes nothing into `element.style`. `startTail` performs no style write of its own — the only statement that touches the element is `element.animate(...)`. `_should compose additively and write no inline style_` asserts both `KeyframeEffect.composite === 'add'` and `harness.item.style.translate === ''` (`kernel.browser.test.ts:1990-2007`).

The one handle the library keeps is the `Animation` in the controller-scoped slot, ended by `cancelTail` with `cancel()` rather than `finish()` (`kernel.ts:560-569`) — which lands the element where flow puts it, because the contribution decays to zero. That is the cancel handle D-155 sanctions, not a lease: nothing in the consumer's DOM carries library state after step 5 of §2.2. See `proof-5` for the one cost of retaining it.

### 2.5 Cancellation trigger points — **exactly the two required**

`cancelTail()` has precisely two call sites:

- `kernel.ts:1207`, the **first statement inside `acquireActivation`'s `try`**, before `getBoundingClientRect()` and before `acquireLift`;
- `kernel.ts:605`, the `finally` of `runPhysicalTeardown`, beside `ingress.abort()`.

`acquireActivation` is reached only from `activate()` (`kernel.ts:1282`), and `activate()` has exactly two callers: the threshold crossing inside `handleMove` (`kernel.ts:1866`, guarded by `dx*dx + dy*dy >= threshold*threshold` at 1847) and the pointerless `handleActivate` (`kernel.ts:1938`, guarded on `phase === PENDING`). **Nothing cancels at `pointerdown` or at admission** — `admitPointer`/`admitCommand` do not reach it. _should keep the tail through a press that never activates_ (`kernel.browser.test.ts:2099-2116`) drives a bare `press()` and asserts the animation survives; _should cancel the tail when the next drag acquires the visual_ (2077-2097) asserts it does not survive an activation.

**One qualification, and it is the recorded trade rather than a defect.** The cancel is not conditioned on element identity: any activation on the controller ends whatever tail is in flight, including a tail belonging to a different element. That is the direct consequence of D-155's "one tail, one controller-scoped slot" and its explicit refusal of a per-element map, stated at the slot's own declaration (`kernel.ts:538-541`). The proof obligation the decision states — a _same-element_ re-grab must cancel — is satisfied a fortiori.

### 2.6 The tail spends `visualSpace` and never `itemSpace` — **holds**

`itemSpace` occurs in `src/kernel/kernel.ts` at exactly two lines: destructured out of `acquireLift` at 1230, and copied onto the activation scope at 1270. It is **never assigned to a field**. The only retained space is `let visualSpace: InheritedSpace` (`kernel.ts:234`), written once at 1242 from the same destructuring, cleared by `clearOperationState` (468), and read at exactly one place — `const space = visualSpace` in `startTail` (`kernel.ts:1539`), which is the sole consumer of the four scalars in the keyframe arithmetic (1550-1554).

The scope's `visualSpace` member is read back from the field rather than from the local (`kernel.ts:1269`, with the reason at 1266-1268), so the value the behavior was handed and the value the tail spends cannot diverge. `itemSpace`'s only consumer in the tree is the sortable's displacement sink, which writes on items. `scope.visualSpace` is also what free drag takes. The projection is applied directly rather than through `session.compose`, which is D-155's trap clause: `compose`'s projection is `null` for both lifted modes (`presentation.ts:601`, the lifted branch passes `null` to `makeSession`) while `visualSpace` is read before any mutation (`presentation.ts:526`) and is the in-flow ancestry the released element returns to.

### 2.7 The five degenerate cases — **all five have the settled behavior**

| Case | Shipped behavior | Site |
| --- | --- | --- |
| **Zero delta** | `dx === 0 && dy === 0` → return; no `animate()` call, and the policy is **not** consulted | `kernel.ts:1521-1523`; test 2036-2053 |
| **No measurement (`targetX === null`)** | the join releases **without pinning** and installs no tail; the settlement is not failed and the terminal is published normally | `kernel.ts:1514-1516`, `1609`, `1442-1455`; test 2601 |
| **Absent policy** | `spec.landingTail` is optional (`?.`) and both behaviors return `null` when `slots.landingTiming` is `null`; `!timing` returns before any DOM contact | `kernel.ts:1530`, `1535`; `sortable/spec.ts:1704`, `free-drag/spec.ts:928` |
| **Reduced motion** | **collapses to `duration: 0`, does not refuse.** The thunk is resolved _before_ the media query is read, so a settle-time side effect is not gated on the user's OS setting | `shared/landing.ts:97-116`; tests `features.browser.test.ts:980-997`, `1028-1060`, `1062-1092` all assert `{ duration: 0, easing: 'ease', composite: 'add' }` |
| **Policy throws** | `unwind` absorbs it into a `DraggableWarning`, no stage, no classified failure, no tail, terminal unchanged | `kernel.ts:1529-1531`, `unwind.ts:44-56`; tests `kernel.browser.test.ts:2140-2159`, `features.browser.test.ts:960-978` |
| **`animate()` refuses** (`NaN`, negative, patched prototype) | same `unwind`; `?? null` leaves the slot empty; presentation was released **before** this line, so there is no state left to break | `kernel.ts:1546-1564`; test 2161-2181 |

Two guards also stand between the release and the animation because both the disposers and the policy are consumer-reachable: `joinLive()` is re-read after the release (`kernel.ts:1514`) and again after the policy call (1535). _should start no tail when the policy destroyed the controller_ (2118-2138) is the executable form.

### 2.8 The smaller SPI is a clean subtraction — **holds, with one contract sentence left behind**

Comparing member by member against `LandingContext` at `09f26770`:

- `fromX`/`fromY`/`targetX`/`targetY` — survive verbatim as `landingTail`'s four scalars.
- `realm` — still reachable: `KernelHost.realm` at the kernel tier, `FeatureContext.realm` at the middle tier, which is where `createLandingTiming` takes it from (`shared/landing.ts:79`, `sortable/landing.ts:27`).
- `visual` and `compose` — still reachable at the kernel tier from `ActivationScope.visual` and `ActivationScope.lift.compose` (`spec.ts:162`, `227`).
- `done`/`fail`/`destroy` — deliberately gone; nothing suspends, and the two failure stages retire with them.

So nothing a feature module needs at landing time is unreachable. The one capability genuinely withdrawn is **owning the interpolation** — a runner driving `requestAnimationFrame`. That is D-155's own content ("the kernel owns the vector, the projection, the slot and the cancel"), not an accidental narrowing. But the contract sentence that justified keeping it is still standing and is now false — see `proof-3`.

## 3. Findings

### proof-1 — `LandingTiming`'s published doc contradicts the settled reduced-motion behavior · **B**

**Finding.** The doc block on the middle-tier `LandingTiming` type states that `null` "is what a reduced-motion preference answers". The shipped policy never answers `null` for reduced motion.

**Current behavior / contract.** `src/shared/composition.ts:56-59`:

> **The tail's timing, resolved once per landing**, or `null` for no tail — which is what a reduced-motion preference answers, and what a policy answers for a drop it does not want interpolated.

`createLandingTiming` returns `{ duration: reduced ? 0 : resolved, easing }` — a `LandingTail`, never `null` (`src/shared/landing.ts:108-116`). D-155's ledger row settles this in the opposite direction: _"The reduced-motion collapse stays a collapse to zero rather than becoming a refusal."_

**Why it is a problem.** `LandingTiming` is published at both middle tiers (`sortable/feature.ts:62-66`, `free-drag/feature.ts:46-53`) and is the type a third-party landing installer authors against. An author who reads this returns `null` under `reduce` and ships the refusal D-155 rejected: the element then arrives with a jump cut rather than on the frame the drop lands, and the two motion preferences differ by more than duration. It also cannot be caught by the type system, since `null` is a legal return.

**Evidence.** `src/shared/composition.ts:56-59` against `src/shared/landing.ts:108-116`; `tests/sortable/features.browser.test.ts:980-997` (`captured` is `[{ duration: 0, easing: 'ease', composite: 'add' }]`, not an absent tail); D-155 row, `.plan/contract/00-index.md:500`.

**Required property.** The published doc of the type a third-party installer implements states the same reduced-motion answer the first-party policy gives and D-155 settles: a collapse to zero, not a refusal. `null` is the answer for a drop the policy does not want interpolated, and nothing else.

### proof-2 — `DOMRealm`'s doc names an object that does not carry it · **B**

**Finding.** `DOMRealm`'s doc block was rewritten by this commit to say the activation scope carries the realm. `ActivationScope` has no `realm` member.

**Current behavior / contract.** `src/kernel/realm.ts:11-12`: _"The activation scope carries it, so a behavior schedules and measures in the realm the controller was built on rather than in the ambient one."_ `ActivationScope` (`src/kernel/spec.ts:157-232`) declares `visual`, `originRect`, `box`, `boxPre`, `visualSpace`, `itemSpace`, `lift`, `motion`, `presentation` — nine members, no `realm`. The realm is carried by `KernelHost.realm` (`spec.ts:35`) at the kernel tier and by `FeatureContext.realm` at the middle tier.

**Why it is a problem.** `DOMRealm` is exported from `kernel.js`, `sortable/feature.js` and `free-drag/feature.js`. Its doc is the sentence that tells a behavior author where to get the value; the sentence sends them to an object that does not have it. The replaced sentence named `LandingContext`, which was correct until this commit deleted it — so this is a repointing that landed on the wrong object rather than pre-existing rot.

**Evidence.** `src/kernel/realm.ts:11-12` (added by `37ae30e6`) against `src/kernel/spec.ts:157-232` and `src/kernel/spec.ts:35`.

**Required property.** The type's doc names an object that actually publishes it — the kernel host at the kernel tier, the feature context at the middle tier.

### proof-3 — contract 03 keeps a spring-authorability clause the shipped SPI falsifies · **B**

**Finding.** `.plan/contract/03-feature-composition.md:1011` was edited by this commit and the clause immediately after the edit — asserted as _"still true and still load-bearing"_ — is now false at every tier.

**Current behavior / contract.** The line reads, after this commit's change to its first sentence:

> The clause that follows it is still true and still load-bearing: **nothing in the contract assumes a CSS timing function or a finite known duration**, which is what keeps a kernel-tier spring authorable and what makes `duration: 0` safe.

`LandingTail` is `{ duration: number; easing: string }` (`src/kernel/spec.ts:330-333`) and both fields are handed straight to `element.animate(..., { duration, easing, composite: 'add' })` (`src/kernel/kernel.ts:1558-1562`). `easing` is therefore assumed to be a CSS easing function, by construction — the contract now assumes exactly what the clause says it does not. A `requestAnimationFrame`-driven spring cannot be expressed at the kernel tier, the middle tier or the ordinary tier: no runner type is published at any of them (`git show 09f26770:packages/drag2/src/shared/landing-runner.ts` is the deleted producer, and §2.8 above enumerates what replaced it).

**Why it is a problem.** `.plan/contract/` is the contract of record this package's implementers and reviewers work from, and the sentence is load-bearing by its own claim. The half about `duration: 0` remains true and the `Infinity` half remains true (`spec.ts:326-328` documents `Infinity` as accepted and never completing), which is what makes the false half easy to carry forward: an implementer reading it will believe a non-CSS curve is still reachable and will not notice it has to be argued for.

**Evidence.** `.plan/contract/03-feature-composition.md:1011`; the diff hunk shows the same line's first sentence rewritten from _"installs a Web Animations runner"_ to _"supplies the timing the kernel's own Web Animations contribution uses"_ while the trailing clause is byte-identical. Against `src/kernel/spec.ts:330-333` and `src/kernel/kernel.ts:1545-1564`.

**Required property.** The contract states what the shipped SPI assumes. Where a capability was withdrawn by D-155, the clause that justified keeping it is retired or restated with what actually survives, rather than reasserted as still true beside the sentence that removed it.

### proof-4 — contract 05's D-67 invariant row still promises a classified failure for a stage with no producer · **B**

**Finding.** The `Contextual landing duration — new (D-67)` invariant row states that a thrown `duration` result "classifies at that moment". Under this commit it does not classify at all.

**Current behavior / contract.** `.plan/contract/05-lifecycle-invariants.md:652`: _"an out-of-domain or thrown result classifies at that moment, exactly as the fixed form's construction-time check does at construction … the reduced-motion collapse still happens **after** resolution and validation, so a bad result is diagnosed under `prefers-reduced-motion: reduce` exactly as it is without."_

At `09f26770` the thunk was resolved inside `LandingStart`, which the kernel invoked under `driver.runLeaf(..., FAILURE_LANDING_CREATE)` (`git show 09f26770:packages/drag2/src/kernel/kernel.ts:1598-1608`) — so a throw was a classified failure. At `37ae30e6` the thunk is resolved inside `landingTiming` (`src/shared/landing.ts:97-107`), reached through `spec.landingTail` inside `unwind(...)` (`src/kernel/kernel.ts:1529-1531`), which absorbs the throw into a `DraggableWarning` with no stage attached (`src/kernel/unwind.ts:47-54`). The drop terminates normally: `tests/sortable/features.browser.test.ts:960-978` asserts one `DraggableWarning`, no animation and one `onFinish`. `FAILURE_LANDING_CREATE` no longer exists.

**Why it is a problem.** This is the invariants ledger — the artifact a reviewer checks a behavior against, whose rows are meant to be executable claims. The row now names a failure classification with no producer, and the "validation" it references was already deleted by D-124. The row immediately below it (`Landing surface — new (D-63)`) _was_ updated for D-155 in this same commit, so the omission reads as an oversight rather than a deliberate deferral.

**Evidence.** `.plan/contract/05-lifecycle-invariants.md:652`, untouched by the diff, against `src/kernel/kernel.ts:1529-1531`, `src/kernel/unwind.ts:47-54` and `src/kernel/failures.ts:29-40` (10-13 recorded as holes). The adjacent updated row is at line 656.

**Required property.** An invariant row that names a failure stage names one that exists. Where D-155 turned a classified failure into an advisory warning, the row says so — or is struck the way the D-63 row beside it was.

### proof-5 — the controller retains the finished tail's `Animation`, and through it the visual · **C**

**Finding.** A tail that completes normally is left in the controller-scoped slot until the next activation or `destroy()`. The retained `Animation`'s effect target is the visual, so the controller holds a strong reference to the last-dragged element after the operation has retired.

**Current behavior / contract.** `kernel.ts:543-545` states the trade deliberately: _"A finished animation is left in the slot rather than cleared through a subscription: cancelling one is a no-op, and one retained `Animation` on a live element is cheaper than a promise per landing."_ `clearOperationState` nulls `visual` (`kernel.ts:465`) but the slot is untouched by both retirement paths — `retireAttempts` says so explicitly (`kernel.ts:451-459`) — so the element reference survives retirement. It is dropped at the next `cancelTail()`, which is `acquireActivation` (1207) or `runPhysicalTeardown` (605).

**Why it is a problem.** The reasoning names a _live_ element, and D-155's soundness clause is _"it dies with the element"_ — the converse, that the slot keeps the element alive, is stated nowhere. The ordinary case after `onEnd` is a framework reconciling the list, which may detach exactly the row that was just dropped; the controller then pins one detached element until the user drags again. It is bounded at one element per controller and only visible through a heap snapshot, so nothing a consumer observes at runtime changes, and `tests/perf/m2-prime.browser.test.ts`'s retention rows would not distinguish it.

**Evidence.** `src/kernel/kernel.ts:451-459`, `465`, `543-547`, `560-569`, `605`, `1207`.

**Required property.** Either the retention is bounded to a live element, or the cost is stated where the trade is argued, so a reader of `kernel.ts:543-545` knows the slot outlives the element rather than the other way round.

### proof-6 — the pin's DOM write is unobservable in the shipped ordering · **C, routed**

**Finding.** Not a defect claim. `d155-space-model-projection-claude.md` §5 lists _"whether the pin remains load-bearing under a tail"_ as open and outside that pass; this pass reached the shipped code and can supply the evidence, so it is recorded here for the architect rather than answered.

**Current behavior.** `session.write(targetX, targetY)` sets `visual.style.transform` (`presentation.ts:387`). `owned.presentation.dispose()` runs in the `finally` on the very next statement (`kernel.ts:1631`) and `captureInlineStyles`' disposer restores or removes `transform`, which is in `LIFTED_PROPS` (`presentation.ts:96`, `156-164`). Both are in one synchronous block, so no frame is produced between them and the pinned transform never paints. Its surviving effects are: recording `rendered` (which nothing reads afterwards — the tail's `fromX`/`fromY` were sampled _before_ the pin, at `kernel.ts:1615`) and providing the `FAILURE_RENDERER_WRITE` classification site whose `failed` flag routes the terminal through the checkpoint (`kernel.ts:1617-1623`, `1634-1648`).

The tail's arithmetic does not depend on the write having landed: `dx = fromX - targetX` (`kernel.ts:1518-1519`) is computed from the sampled value and the measured target, both of which exist whether or not the pin succeeded — and when it fails, `startTail` is not reached at all.

**Why it is worth recording.** Three doc blocks describe the pin as the authoritative final position — `presentation.ts:296-302` (_"the authoritative pin at the join, and it is the last write this session makes"_), `kernel.ts:1570-1574`, `kernel.ts:1603-1606` (_"the tail is the inverse of the delta this pin applied"_). All three remain true as descriptions of intent, and the arithmetic they justify is correct; what is no longer true is that the write has a rendering consequence. Whether the write should stay as a fault-detection site, or whether the classification it provides can be sited elsewhere, is a design call.

**Routed to.** The architect, against the open item in `.plan/reviews/phase-24/d155-space-model-projection-claude.md` §5.

## 4. Null results

Stated as outcomes, not left silent:

- **No runner-shaped seam survives at any tier** (§2.1). `LandingTail` is `{ duration, easing }` and nothing reconstructs a phase machine, a completion contract or a terminal-state enum around it.
- **No code path makes the terminal wait on the tail** (§2.3). No `finished`/`ready` subscription on the kernel's animation exists in `src/`.
- **The tail writes no inline style and leaves no cleanup owner** (§2.4). No `fill`, no `element.style` write in `startTail`.
- **Cancellation is not at admission, and not at `pointerdown`** (§2.5). Two call sites, both verified by callers.
- **`itemSpace` is never retained and never spent by the tail** (§2.6). Two occurrences in `kernel.ts`, neither a field write.
- **All five degenerate cases resolve as settled** (§2.7), each with an executable row.
- **No capability a feature still needs was removed** (§2.8). Every surviving member of the deleted `LandingContext` remains reachable through `KernelHost`, `FeatureContext` or `ActivationScope`.
- **The tail and `layoutAnimation` cannot collide.** Both use additive `translate`, but the displacement plan covers the destination view — the collection minus the dragged item — and the tail's element is the visual, which is that item or a descendant of it (`src/sortable/layout-animation.ts:36-41`). They are also disjoint in time: displacement settles at release, before the join. F-253's correction is reflected in the shipped comment.

## 5. Method

Read the D-155 ledger row, both named review records, and `CONTRIBUTING.md` §13 and `.agents/docs/review-findings.md` before writing. Read every `src/` file in the diff in full at `37ae30e6`, plus `src/kernel/unwind.ts`, `src/kernel/lifetimes.ts` and the deleted `src/shared/landing-runner.ts` and `LandingContext` at `09f26770`. Traced `activate` → `acquireActivation` → `acquireLift` and `openSettlement` → `measureTarget` → `joinSettlement` → `startTail` → `finalized` statement by statement, and confirmed each `cancelTail` and `activate` call site by grep over `kernel.ts`. Ran the full package suite; every figure in §0 is from that run. Every line number cited was read in this pass. LSP was probed twice via `ToolSearch` and returned no definition/reference tools, so symbol work was done with grep.