# Checkpoint D fourth review — architect resolution of the `landing()` terminal-barrier residue

Scope: the **open residue** recorded in [`checkpoint-d-4-resolution-implementation.md`](checkpoint-d-4-resolution-implementation.md) §Residues item 1 and enumeration row **#15** — `landing()`'s `duration` thunk followed by `visual.animate()` — and the question C4-01 raised about it: whether I-36's indirect-invocation clause is satisfiable as written.

Not reopened: C2-01's mechanism (behavior-owned latch on `SortableRuntime.closed`, `live` on the per-operation view), C3-01's boolean return channel, **C3-03's tier split**, D2, D5, L-11. Nothing here argues against any of them; §9 says where each is touched and where it is not. **No production source or test change is decided here.** Two obligations are created — a documentary correction and one test — and both are named.

---

## Decision

**The residue is conforming, not a defect. The frozen SPI does not reopen. What must change is I-36's indirect-invocation clause, which as written states an obligation no implementation can be shown to discharge — it becomes a floor plus a register.**

1. **The residue falsifies I-36's indirect-invocation clause on the letter and nothing else.** It does not falsify I-6 clause 3 except in a constructed case (a consumer who overrode `animate` on their own element), and in that case the only consequence is one `animate()`/`cancel()` pair the kernel issues inside the same synchronous stretch, on an element it has already stopped rendering. §1.
2. **Contract 00's bar is not cleared, and the recorded reason for not deciding is wrong.** Conjunct 2 fails outright. Closing this needs **no** frozen type: `FeatureContext` — behavior-owned, declared in `src/sortable/feature.ts`, exported from no entrypoint, and already carrying a behavior-supplied closure (`report`) of exactly this species — reaches the interior of `start`. `LandingContext` is the wrong type and would additionally be a **public**-surface change. F-47's sentence *"Every non-SPI shape was examined and none reaches it"* is false and must be corrected whatever else is decided. §2.
3. **I-36's indirect-invocation clause is not satisfiable as written.** Not because no implementation can conform, but because none can be *shown* to conform and no reviewer can enumerate the obligation: the governing set is every overridable member of every consumer-owned node. It is replaced by three parts — **provisioning** (universal, quantified over *modules*, checkable by inspection), **a five-act floor** (universal, checkable by test), and **a register of named ceilings** (site-specific promises, closed because it is a set of written statements rather than a set of call sites). **A site absent from the register gets the floor and nothing more, and that it has no ceiling is not a finding.** §3, exact wording in §4.
4. **`FeatureContext.live` is the decided remedy and is deferred**, with a stated trigger, to Phase 18/21 behind Phase 21's budget re-base. Measured, not forecast: **+6 B to +53 B** brotli, worst case `complete`, which leaves **53 B** of its budget instead of 106 B. §7.
5. **This decision costs 0 B and 0 per-frame work.** The wording must land before Checkpoint D closes — same argument as C3-03 §6, markdown only. The code must not. §7.

---

## 1 — Is this a violation, and of which row?

### The sequence, re-derived from source

`src/sortable/landing.ts:82-164`. Inside `LandingStart`, in order:

1. `timing()` — the consumer's `duration` thunk, when one was declared (`:95-98`). A **declared** consumer callback.
2. `realm.window.matchMedia?.('(prefers-reduced-motion: reduce)')` (`:103`).
3. `visual.animate([...], animationTiming)` (`:132`), inside `play`.
4. `started.finished.then(...)` (`:138`).

Step 1 can call `controller.destroy()`. That sets `rt.closed`, runs `host.destroy()`, and the seven-step teardown completes — including presentation disposal, which removes the placeholder and restores the visual's inline styles — before returning into `start` at step 2.

### What actually happens next, and it matters

The kernel's own barriers are both present and both fire. `armSettlement` (`src/kernel/kernel.ts:1245-1361`) reserves the hold *before* calling `start` and publishes the handle only after it returns, and the revalidation at `:1349` is exactly F-30:

```
if (!settlementLive(attempt)) {
  const runner = handle!;
  guarded(() => { runner.destroy(); });
  rollbackLandingHold(attempt);
  return ARM_STALE;
}
```

`rt.closed` implies `!settlementLive(attempt)` — the latch is set by `controller.destroy()`, whose only body is `rt.closed = true; host.destroy()`, and `host.destroy()` retires the attempt. So the handle is destroyed, which is `generation += 1; animation.cancel()`, and `cancel()` removes the effect including the forwards fill. **The landing never starts.** Nothing is reported: `started` is true and `attempt.failed` is false, so the path is `ARM_STALE`, not `ARM_FAILED` — which is right, because a consumer destroying its own controller is not a library failure.

Three hazards were checked and are absent:

- **No paint between `animate()` and `cancel()`.** Everything from step 3 to the kernel's `runner.destroy()` is one synchronous stretch with no style flush and no rAF boundary.
- **No orphan animation on a throw.** If `started.finished` or `then` throws, `play`'s own `catch` (`:150-156`) bumps the generation and cancels before rethrowing — so the `handle === undefined` branch at `:1333` has nothing to leak.
- **No late completion.** `done`/`fail` route to `completeLanding` on a retired attempt and are inert (D-28).

**The recorded blast radius is accurate**: one `animate()` on an element the kernel is about to stop rendering, with the landing itself never starting.

### Which row is violated

| Row | Verdict |
| --- | --- |
| **I-6 clause 3** — "no callback fires afterwards" | **Not falsified in the general case.** `Element.prototype.animate` is a platform method; no consumer callback fires. Falsified only where the consumer overrode `animate` on their own element, and then only by one call whose every effect the kernel undoes before returning. |
| **I-6 clauses 1 and 2** — synchronous, terminal, physical release complete before return | **Not falsified.** Teardown ran to completion; nothing here prevents or reorders a step. |
| **I-36, indirect-invocation clause** | **Falsified on the letter.** `landing()` invokes consumer-supplied code (`timing()`), then reaches consumer code again indirectly through a consumer-owned node (`visual.animate()`), with no reading between them. |
| **F-30** | **Satisfied**, and it is the reason the residue is inert. |
| **I-20** | **Not falsified.** Nothing is published, nothing is retained, `rt` is untouched by `start`. |

So this is neither a defect nor a wording artifact in the trivial sense. It is **the third instance of one clause being wider than anything the library can promise**, and that is what §3 addresses. Recording it as an "open residue against I-36" was accurate reporting of a real gap; treating it as a defect to be patched would be the fourth pass of the same mistake.

### One thing the record understates

`matchMedia` at `:103` reaches `realm.window`, which is the consumer's window. Under the same clause reading that makes `animate()` a consumer call, `matchMedia` is one too — so the sequence has **three** consumer-reachable calls after the thunk, not one, and a reading placed between the thunk and `animate()` would leave one of them. That is not a reason to place two readings. It is the clearest available demonstration that the clause is enumerating the wrong thing.

## 2 — Contract 00's bar, checked honestly

> A further contract change requires a failing executable lifecycle case **that the frozen SPI cannot express**; a prose-only review finding is not sufficient. — `contract/00-index.md` §Normative precedence and freeze

### Conjunct 1 — a failing executable lifecycle case

**Contingent on §3, and that is worth stating plainly rather than resolving in the SPI's favour.** A case can be written today:

```
landing({ duration: () => { controller.destroy(); return 200; } })
```

with `animate` instrumented on the visual, asserting zero calls. It fails against current source. But *that assertion is normative only because of the clause whose satisfiability is in question.* Under §4's wording the same case asserts nothing the library promises, and there is no failing case at all. The bar's first conjunct is therefore being satisfied by the artifact of the second review's wording, which is close enough to circular that it cannot carry an SPI change on its own.

### Conjunct 2 — can the frozen SPI express the fix?

**Yes, completely, and the implementation record's premise is wrong.** F-47 currently states:

> Every non-SPI shape was examined and none reaches it: the behavior can wrap `slots.startLanding` from the outside, which does not help, and the feature has no per-operation view. So this is a `LandingContext` question…

The second clause is the error. A feature has no per-operation view, but it has a **construction-time context**, and it is behavior-owned:

```ts
// src/sortable/feature.ts:29-41
export type FeatureContext = Readonly<{
  realm: DOMRealm;
  root: HTMLElement;
  report(error: unknown): void;
}>;
```

Every fact needed follows from where that type lives and who fills it:

- It is declared in `src/sortable/feature.ts`, **not** `src/kernel/spec.ts`. No kernel type, no seam signature, nothing frozen.
- It is constructed by the sortable behavior, at `src/sortable/behavior.ts:70`, from `host.realm`, `host.root` and the module-level `report`.
- It is **not exported from any entrypoint.** `src/sortable.ts` exports `SortableFeature` and deliberately does not drag the authoring types in — `plan.md:224` records that as the reason `SortableFeature` is declared in `feature.ts` and re-exported rather than declared in the entry.
- It **already carries a behavior-supplied closure for exactly this purpose.** `report` exists because "a feature closure created at construction cannot know which operation is live". `live` is the same species of thing, supplied by the same party, for the same reason.
- `landing()`'s factory is already handed it and ignores it: `brandFeature(() => ({ startLanding: start }))`.

So the fix is a **sixth additive widening of a behavior-owned internal type**, which contract 03 §Feature composition has already recorded as a routine act (C2-01 §9.5, pre-recording the fifth). The frozen SPI expresses it at zero SPI cost. **Conjunct 2 fails, and the bar is not cleared** — for a stronger reason than C2-01's, because there the channel had to be widened and here it already exists.

### What `LandingContext` would have cost, since it was the proposal on the table

`LandingContext` is re-exported from `src/sortable/landing.ts:24` and reaches the consumer through the `./sortable/landing.js` entry. Widening it is **two** changes, not one:

1. a frozen-SPI change to `src/kernel/spec.ts`, and
2. **an addition to the frozen public surface** — a new capability on the type every custom `run` runner is written against, permanent, and an M-3 re-measurement trigger under the same rule L-11 was deferred for.

That is a distinct, flagged consequence and it is the one the task asked to be separated from the SPI question. It is rejected on its own: a consumer's replacement runner is consumer code, I-36 cannot bind it, and handing every consumer runner a liveness reading buys the library nothing it can enforce.

**Conclusion: the SPI stays shut for the third consecutive pass, by a third independent route.** That is now evidence about the boundary rather than three coincidences.

## 3 — Is I-36's indirect-invocation clause satisfiable as written?

This is the part that decides everything else.

### The clause

> …stops on the first closed reading — **invoking no further consumer code, including indirectly through a consumer-owned object** (an overridden `getBoundingClientRect()` on a consumer-authored placeholder is a consumer call, not a layout read), publishing nothing, and leaving any cache it was rebuilding in its retired state

### The answer: no, and the failure is in the quantifier, not in the substance

**The substance is right.** An overridden `getBoundingClientRect()` *is* consumer code, and C3-03 was correct to say the row was the only one of four that omitted it. The defect is in what the clause quantifies over.

Read literally, the governing set is *every property access and method call the library makes on any consumer-owned node.* Enumerated: `getBoundingClientRect`, `animate`, `getAnimations`, `offsetWidth`, `offsetHeight`, `before`, `after`, `remove`, `replaceWith`, `insertBefore`, `compareDocumentPosition`, `contains`, `nextElementSibling`, `parentElement`, `isConnected`, `getAttribute`, `setAttribute`, `removeAttribute`, `classList`, `style`, `matches`, `closest`, `scrollIntoView`, `focus`, `dispatchEvent`, `addEventListener`, and every getter reachable through any of them. All are overridable on a custom element. The set is not merely large — it is **not closed**, because the consumer chooses it.

Three properties follow, and together they are the finding:

- **Unverifiable in the positive.** No inspection and no test suite can establish that a barrier stands between every pair. The witness set is unbounded.
- **Unfalsifiable in the negative, except one site at a time.** A reviewer can always construct the next site, and cannot construct the last one. Four passes, each closing what the previous reviewer reproduced (C2-01 → C3-01 → C4-01 → this residue) is not bad luck; it is the shape of the clause. C4-01's phrase — *"a site-by-site barrier against an open-ended set converges only by exhaustion of reviewers"* — is correct, and stronger than it claims: it does not converge at all, it terminates when reviewers stop.
- **Not fully dischargeable even in principle at some sites.** Some consumer-reachable calls are *paired* and admit no barrier between them: `visual.animate()` and the `animation.cancel()` that undoes it; `item.after(placeholder)` and the `connectedCallback` that runs inside it. A rule that requires a reading between every pair requires readings that cannot be placed.

**So the clause states an obligation that is real in substance and non-operational in form.** Keeping it as written guarantees a residue per review, forever, and — worse — it inverts the reviewer's job: instead of asking "does this cause harm?", the fourth reviewer's only available question is "can I find one more call?", to which the answer is always yes.

### What replaces it, and why these three parts

C4-01 already built the right rule and wrote it in the wrong document. Its §"Site-by-site or a general mechanism" says:

> …**every participant that touches consumer DOM is handed a liveness reading** rather than having its caller patched. That is what makes it checkable by inspection: "does this module touch a consumer-owned node, and does it have `live`?" is a question with a mechanical answer, where "is `getBoundingClientRect` on the list?" is not.

That is exactly the fix, and it belongs in the invariant. It needs two companions to be complete.

**(1) Provisioning — quantify over modules, not call sites.** Modules are enumerable (there are ten in `src/sortable/`), the question is mechanical, and the answer is a yes/no per module. This is a **closed, checkable, complete** obligation, and it is the one an implementer and a reviewer can both discharge. It is also the one that generalises to Phase 18 without translation.

**(2) A floor — quantify over consequences, not calls.** After a closed reading, five acts are forbidden:

| # | Act | Witness |
| --- | --- | --- |
| 1 | publishing state that outlives the operation | I-20; the published field |
| 2 | retaining a reference past `retire()` | I-20; the retired container |
| 3 | mutating DOM that teardown will not undo | the DOM after `destroy()` returns |
| 4 | invoking a **declared** consumer callback — a slot the consumer filled | the callback's call list |
| 5 | dereferencing state `retire()` may have nulled | the throw |

Each has an observable witness, so the floor is **testable**. And it is the honest statement of what the library can promise: a consumer-reachable call that does none of the five is not distinguishable by the consumer from the platform doing its own bookkeeping on an element that is about to stop being rendered.

The floor is calibrated against the three landed findings, which is the check that it is neither too weak nor too strong:

- **C4-01's candidate-geometry gap breaches it**, on acts 1, 2 and 4: the cache write, the trailing bookkeeping that marks a retired index clean and measured, and the next candidate's `getVisual`. Still a defect.
- **C4-01's `release.effect` gap breaches it**, on acts 5 and 1: `rt.lift!.write(...)` after `retire()` nulled `rt.lift`, and the `rt.pendingRequest` publication two lines later. Still a defect — and, as the implementation record notes, the review had not named it as a crash.
- **The `landing()` residue does not breach it.** No publication, no retention, no surviving mutation, no declared callback, no throw. **Conforming.**

**(3) Ceilings — a register, not a quantifier.** Where the library chose to promise more than the floor at a named site, the promise lives *at that site* and is enforceable there:

- `contract/03-feature-composition.md:410` — *"calls nothing further, **reads no further geometry**, and leaves the cache in the **retired** state"*, for the candidate loop;
- `README.md:57` — the same, published to consumers, including the no-`visual()` composition.

This is the part that stops reviewer exhaustion, because **the register is closed by construction**: it is a set of written statements, not a set of call sites. A fourth reviewer now has a decision procedure with three steps and a terminating answer:

> Is this site in the register? → No → it gets the floor → does it breach one of the five acts? → No → **conforming residue; state it and stop.**

And C3-01 remains a defect under the new rule, which is the discriminating check on part (3): its site *is* in the register, at `03:410` and `README:57`, and it breached a ceiling those two documents state. Without part (3) the narrowing would retroactively reclassify C3-01 as conforming, which would be dishonest and would delete a promise the README already makes to consumers.

### What this is not

- **Not a relaxation of any landed barrier.** The narrowing is asymmetric on purpose: it governs whether a *missing* reading is a defect, and licenses removing **nothing**. All nine of C4-01's readings stay, including the three with no discriminating fixture — C2-01 §7's noise-band argument is unaffected, and removal would cost a re-review to buy bytes brotli cannot see.
- **Not a change to C3-03's tier split.** I-6 stays `B for every call the kernel sequences, over a tier-C participant obligation`. What changes is that the tier-C half is *bounded* instead of unbounded, which is what a tier-C residue with a stated limit is supposed to be — I-32's idiom, which C3-03 itself identified as I-6's true peer.
- **Not "keep it and accept perpetual residues."** That option was considered and is rejected in §5.

## 4 — The exact wording to implement

Format matches the document's own: single-line table rows, `**bold**` on the load-bearing clause, sections as `§[NN](NN-file.md)`.

### 4.1 · `05-lifecycle-invariants.md` — I-36, invariant text (cell 2)

Replace, in the row beginning `| I-36 | **Foreign code invoked in a sequence is terminal-aware.**`:

> **Foreign code invoked in a sequence is terminal-aware.** A participant that invokes consumer-supplied code more than once inside one kernel-driven seam, or inside one native admission, reads the controller's terminal latch **between** invocations and stops on the first closed reading — **invoking no further consumer code, including indirectly through a consumer-owned object** (an overridden `getBoundingClientRect()` on a consumer-authored placeholder is a consumer call, not a layout read), publishing nothing, and leaving any cache it was rebuilding in its retired state

with:

> **Foreign code invoked in a sequence is terminal-aware, to a stated floor.** A participant that invokes consumer-supplied code more than once inside one kernel-driven seam, or inside one native admission, reads the controller's terminal latch **between** invocations and stops on the first closed reading. The obligation has three parts, and the split is what makes it dischargeable. **(1) Provisioning — universal and closed.** Every module that reaches consumer code, directly through a declared slot or indirectly through a consumer-owned node, **holds a liveness reading**; the obligation quantifies over *modules*, which are enumerable, not over call sites, which are not. **(2) The floor — universal and closed.** After a closed reading the participant performs none of five acts: **publishing state that outlives the operation**, **retaining a reference past `retire()`**, **mutating DOM teardown will not undo**, **invoking a declared consumer callback** — a slot the consumer filled — or **dereferencing state `retire()` may have nulled**. A consumer-reachable call that does none of the five, such as an overridable platform member on a node the kernel is about to stop rendering, is a **conforming residue**: stated with its blast radius, not a defect. **(3) Ceilings — a register, not a quantifier.** Where the library promises more than the floor at a named site the promise is written *at that site* — §[03](03-feature-composition.md) §`y()`/`xy()`'s "reads no further geometry" for the candidate loop, and the README's publication of it — and is enforceable there. **A site absent from the register gets the floor and nothing more; that it carries no ceiling is not a finding**

### 4.2 · `05-lifecycle-invariants.md` — I-36, mechanism cell (cell 4)

Replace the sentence block:

> **The indirect-invocation clause is not new scope.** C2-01 §4A accepted "call no further resolver *and read no further geometry*", §[03](03-feature-composition.md) §`y()` and §`xy()` states it normatively, and the README publishes it; this row was the only one of the four that omitted it, which is exactly the omission that would let a post-terminal geometry read be argued as conforming.

with:

> **The indirect-invocation clause was a universal at C3-03 and is a floor-plus-register since Checkpoint D review 4.** C3-03 §3.2 was right that the substance was not new — C2-01 §4A accepted "call no further resolver *and read no further geometry*", §[03](03-feature-composition.md) §`y()`/`xy()` states it normatively, and the README publishes it, and this row was the only one of the four that omitted it. What it did in importing them was generalise three **site-specific** statements into a quantifier over every consumer-reachable call, and **that quantifier is not dischargeable**: the governing set is every overridable member of every consumer-owned node, it is chosen by the consumer rather than by the library, it cannot be enumerated, and some consumer-reachable calls are paired (`animate()` and the `cancel()` that undoes it; `after()` and the `connectedCallback` inside it) so no reading can be placed between them. Three consecutive passes each closed the one site the previous reviewer reproduced — C3-01's placeholder read, C4-01's candidate geometry, and the `landing()` thunk-to-`animate()` gap — which is the shape of the clause and not bad luck. So the substance is retained and its reach is bounded by (2) and (3). **(1) is C4-01's own rule, promoted from its implementation record**: it built the barrier structurally, by handing every participant that touches consumer DOM a liveness reading rather than patching its caller, on the argument that "does this module touch a consumer-owned node, and does it have `live`?" has a mechanical answer where "is `getBoundingClientRect` on the list?" does not. **(2) is calibrated against the three findings**: C4-01's candidate-geometry gap breaches acts 1, 2 and 4, its `release.effect` gap breaches acts 5 and 1, and the `landing()` residue breaches none — so the floor reclassifies the residue without absolving either defect. **(3) is what keeps C3-01 a defect**: its site is in the register, and it breached a ceiling §[03](03-feature-composition.md) and the README state. **The narrowing licenses removing no landed reading**; it governs only whether a missing one is a defect.

### 4.3 · `05-lifecycle-invariants.md` — I-6, mechanism cell, one appended sentence

After:

> That residue is **I-36**, is tier C, and is **not promotable**: wrapping those calls would require the kernel to know a behavior's consumer surface (H-1, H-2, D-4).

insert:

> **Since Checkpoint D review 4 that residue is bounded rather than open-ended.** I-36 guarantees its five-act floor at every site and the stronger "no further geometry" form only at the sites that state it, so for the **participant** half clause 3 reads *no callback with a consequence the operation outlives*. Clause 3's headline is retained verbatim and is unaffected for the **kernel** half, which is where all six of its other citations sit — a residue whose only effect is one overridable platform member on a node the kernel is about to stop rendering is conforming, is stated, and is not a defect (I-36 (2), F-47).

### 4.4 · `05-lifecycle-invariants.md` — the tier legend, one appended sentence

At the end of the combined-rating paragraph C3-03 §3.4 added, after *"An unqualified letter over a partitioned property is a defect, not a simplification — C3-03 is the last one found."*, append:

> **A tier-C half needs a stated limit as well as a stated owner.** C3-03 gave I-6's residue an owner and left its extent universal, and one pass later that produced a fourth residue against a clause no implementation could be shown to discharge. Where the C half is a residue rather than a disclaimer, state what it guarantees everywhere (a floor) and where it guarantees more (a register), so that a missing barrier can be classified instead of only counted — I-36 (2) and (3).

### 4.5 · `05-lifecycle-invariants.md` — F-47, the enumeration row

Replace:

> | `landing({ duration })` thunk → `visual.animate()` | consumer runner, inside `start` | kernel revalidates after `start` (F-30). **The thunk-to-`animate()` gap is open** — see the residue note below |

with:

> | `landing({ duration })` thunk → `visual.animate()` | **feature**, inside `start` | kernel revalidates after `start` (F-30). **Conforming residue under I-36 (2)** — the gap is real, the floor is not breached, and the site carries no ceiling; see the residue note below |

### 4.6 · `05-lifecycle-invariants.md` — F-47, the residue paragraph

Replace the whole paragraph beginning **"One stated residue, deliberately not closed at C4-01, because closing it needs the frozen SPI."** with:

> **One conforming residue, and the reason C4-01 left it open was wrong on the facts.** `landing()`'s `duration` thunk is consumer code called inside `LandingStart`, and the next statements reach the consumer's own visual — `realm.window.matchMedia`, then `visual.animate()` — with no reading between them. C4-01 recorded this as a `LandingContext` question and therefore a frozen-SPI question. **It is neither.** `FeatureContext` (`src/sortable/feature.ts`) is behavior-owned, is constructed by the behavior at `src/sortable/behavior.ts`, is exported from no entrypoint, and already carries a behavior-supplied closure — `report` — for the same reason a liveness reading would be one; `landing()`'s factory is handed it and ignores it. So a **sixth** additive widening of a behavior-owned internal type closes this, measured at **+6 B to +53 B** brotli, and the frozen SPI does not enter into it. Widening `LandingContext` instead would be both an SPI change and an addition to the **frozen public surface** — it reaches every consumer-authored `run` runner through `./sortable/landing.js` — and is rejected on that ground independently. **The remedy is decided and deferred** (Phase 18/21, behind Phase 21's budget re-base), because under I-36 (2) the site is **conforming**: the blast radius is one `animate()` on an element the kernel is about to stop rendering, the kernel's F-30 revalidation destroys the handle and `cancel()` removes the effect inside the same synchronous stretch with no intervening paint, nothing is published or retained, and the landing never starts. **The trigger that reopens it**: a second consumer-reachable call inside `start` whose effect survives teardown, a first-party landing runner that publishes state after the thunk, or any first-party feature that reaches consumer code outside a per-operation view — at which point `FeatureContext.live` lands for the class rather than for this site. One ordering constraint for whoever takes it: `assemble()` runs before `rt` exists, so the closure is late-bound and a feature factory must not call it at construction, which the "externally inert" factory rule already forbids.

### 4.7 · `01-construction-ownership.md` §Teardown, one clause

In the converse-obligation paragraph, replace:

> it reads the terminal latch and stops on the first closed reading, calling nothing further, publishing nothing, and leaving any cache it was rebuilding in the retired state step 4 just put it in.

with:

> it reads the terminal latch and stops on the first closed reading, publishing nothing, retaining nothing, invoking no declared consumer callback, and leaving any cache it was rebuilding in the retired state step 4 just put it in. **The obligation is a floor over consequences plus a register of stronger site-specific promises, not a quantifier over call sites** — §[05](05-lifecycle-invariants.md) I-36 (2) and (3) state why the quantifier form is not dischargeable.

### 4.8 · `03-feature-composition.md` §`y()`/`xy()`, one appended sentence

After the sentence at `03:410` ending *"…see §[05](05-lifecycle-invariants.md) I-36."*, append:

> **This paragraph is a ceiling in I-36 (3)'s register**: the candidate loop promises more than I-36's floor — no geometry read at all, not merely no consequence — and that promise is enforceable here and is pinned by the per-axis geometry rows in `tests/COVERAGE.md`. Sites not in the register get the floor.

## 5 — Alternatives, and what decided against each

| Alternative | Rejected because |
| --- | --- |
| **Widen `LandingContext` with `live`** | Fails contract 00's second conjunct outright (§2), and is **two** frozen changes rather than one — SPI plus public surface, reaching every consumer `run` runner permanently, with an M-3 re-measurement trigger. Buys nothing enforceable: a consumer runner is consumer code and I-36 cannot bind it. |
| **Use `presentation.signal`** | **Does not reach.** `start` is invoked by the kernel from `armSettlement`; the context carries `visual`, `compose`, `from`, `target`, `realm` and no lifetime, and `landing()`'s factory is handed no scope. Delivering it needs the same widening as `live`, so it is not a cheaper route — and it is the *stronger* reading (it also sees a `panic()` destroy), which is worth recording: if a route ever exists, prefer it over the latch, exactly as `activation.effect` does. Timing is right, incidentally — presentation is disposed in the join, so the signal is still live during `armSettlement`. |
| **Land `FeatureContext.live` now** | Correct in shape, wrong in timing. It is **not kernel-shaped**, so C2-01 §10's "last cheap moment" argument does not apply — nothing about it gets more expensive after Checkpoint D, and free drag will build its own `FeatureContext` in `src/free/`, so landing it here transfers a precedent that this document transfers for free. Against that: 53 B of the 106 B tightest headroom, at a moment `plan.md` §Phase 21 already names the re-base as the next size-affecting change's precondition. And decisively — **it does not close the class.** A consumer-supplied `run` stays unguarded by construction; `retarget`'s `getComputedStyle` → `animate` pair is arguable under the same clause; `matchMedia` is arguable. Buying this site leaves the fifth reviewer the fourth site. |
| **Change `landing()`'s runner not to animate after the thunk** | There is no witness available inside `start`. The visual is the consumer's own element and is still connected after teardown; `compose` is a pure closure and still works; `realm` is unchanged. And the thunk cannot move: D4 (Checkpoint D) fixes it *before* the reduced-motion test and *before* the animation is built, for parity with the shipped `landingTiming()`, and its resolved value is an input to `animate()`. Without a reading there is nothing to branch on. |
| **Keep the clause as written and accept perpetual residues** | This is the status quo and it is the one option that is actively harmful. It leaves the Phase 18 author an obligation stated as universal and dischargeable only by exhaustion, in a row `plan.md` §Phase 18 explicitly tells them to read as their acceptance criterion. The predictable outcome is either a fifth residue against free drag or an author who reads I-36 as unmeetable and treats the enumeration deliverable as advisory — the exact failure mode C3-03 §6 named. |
| **Delete the indirect clause** | Rejected. It would retroactively absolve C4-01's candidate-geometry defect, which reached a composition installing no `visual()` at all, and would falsify `README.md:57`'s published promise. The substance is right; only the quantifier is wrong. |

## 6 — Tests

**No barrier is added, so no barrier test is added.** One test is owed, and it is the acceptance condition for calling the residue conforming rather than open — it converts a prose blast-radius claim into an executable one, which is the standing lesson of the last four passes.

**`tests/sortable/landing.browser.test.ts`** (or wherever the composed landing cases live), one case — *should leave nothing behind when the duration thunk destroys the controller*:

- compose `landing({ duration: () => { controller.destroy(); return 200; } })` through a real drag to release;
- assert, after the drag settles: `visual.getAnimations()` is **empty**; the visual's inline `transform` is the pre-drag value teardown restored; `onError` was not called and no `FAILURE_LANDING_CREATE` was reported; `onCancel` fired exactly once, from the `destroy()`; the placeholder is gone.

This case **passes against current source**, and that is the point — it is a conformance pin for the floor, not a regression pin for a barrier. It must be labelled as such in `tests/COVERAGE.md` so the next reviewer does not read a passing test as a barrier that exists.

Optionally, and cheaply, a second assertion in the same case: instrument `animate` on the visual and assert it is called **once** — recording the residue's exact size, so that if a future change makes it two the test says so.

**Nothing existing is weakened.** All 16 of C4-01's cases and all nine of C2-01's pin the floor or a register ceiling and are unaffected by the rewording; C3-01's per-axis geometry rows become explicit register-ceiling tests and should be labelled so.

## 7 — Cost and timing

### The decision's own cost

**0 B. 0 per-frame work. 0 heap.** Five markdown files and one test. No source change, no rebuild, no `just size` run required to land it.

### The deferred remedy's cost — measured, not forecast

Prototyped in place and reverted (`git status` verified clean; §9). `FeatureContext` gains `live(): boolean`; `install` takes a slot-builder so the late-bound closure can be created before `assemble`; `landing()`'s factory destructures `live` and `start` returns a module-level inert handle on a closed reading before the reduced-motion test.

| Composition | Landed | Prototype | Δ | Budget | Headroom after |
| --- | ---: | ---: | ---: | ---: | ---: |
| minimal | 10,116 B | 10,127 B | **+11** | 10,260 | 133 B |
| minimal (xy) | 10,168 B | 10,174 B | **+6** | 10,310 | 136 B |
| + `layoutAnimation` | 10,563 B | 10,573 B | **+10** | 10,670 | 97 B |
| + `landing` | 10,405 B | 10,430 B | **+25** | 10,560 | 130 B |
| complete | 10,934 B | 10,987 B | **+53** | 11,040 | **53 B** |
| baseline A | 10,668 B | 10,690 B | **+22** | 10,810 | 120 B |
| baseline B | 6,889 B | 6,889 B | 0 | 7,100 | 211 B |

**It fits — no budget is breached — and it halves the tightest headroom**, from 106 B to 53 B on `complete`. Module counts unchanged. Per-frame: one boolean-returning closure call **per landing**, which is once per completed drag, on a path that is already building a WAAPI animation. The hot path M-1 measures is untouched. Heap: one closure per controller, copied by reference into the feature context; nothing per operation.

The +11 B in `minimal`, which installs no `landing()`, is the `behavior.ts` restructure — the one part of the change that every composition pays. That is the honest cost of a construction-time channel and is the reason the change is worth making once, for the class, rather than twice.

### Timing

**The wording lands before Checkpoint D closes. The code does not.**

**Why the wording must land.** The argument is C3-03 §6's and applies with more force. `plan.md` §Phase 18's deliverable instructs the free-drag author to *"Read I-6 and I-36 as one pair before starting"* and to enumerate every consumer callback the behavior invokes. Today that pair tells them the obligation is universal over consumer-reachable calls, which is an instruction to do something no implementation can be shown to have done. Closing D that way produces either a fifth residue at Checkpoint E against a behavior with a larger consumer surface than the sortable's, or an author who correctly concludes the clause is unmeetable and treats the deliverable as advisory. Both are worse than the tier error C3-03 was convened to fix, and this is markdown only.

**Why the code must not.** Three reasons, in order of weight:

1. **It is not kernel-shaped.** Checkpoint D's stated purpose is *"the last cheap moment to change anything sortable-shaped that leaked into the kernel"*. `FeatureContext` is `src/sortable/`-local, additive, and reversible. It is exactly as cheap in Phase 21 as now.
2. **Phase 21's re-base is already stated as the precondition** for the next size-affecting change, and this would consume half the remaining room on `complete` for a site that is conforming under the rule this document lands.
3. **It does not close the class**, so it does not buy the thing that would justify spending the headroom early. §5.

**Not blocking, and it does not extend the closure pass.** Like C3-03 this creates no source obligation on the critical path. It can be applied before, after or between anything remaining; it has one editing collision, in §9.

## 8 — Consistency sweep

Executable as written. Match on the quoted text rather than on line numbers — four passes have moved them.

### Required

| # | File · anchor (quoted) | Change |
| --- | --- | --- |
| 1 | `contract/05-lifecycle-invariants.md` — I-36 row, cell 2, `**Foreign code invoked in a sequence is terminal-aware.**` | Replace the invariant text — §4.1. Tier stays **C** |
| 2 | `contract/05-lifecycle-invariants.md` — I-36 row, cell 4, `**The indirect-invocation clause is not new scope.**` | Replace that sentence block — §4.2 |
| 3 | `contract/05-lifecycle-invariants.md` — I-6 row, cell 4, `wrapping those calls would require the kernel to know a behavior's consumer surface (H-1, H-2, D-4).` | Insert one sentence after it — §4.3. **The Tier cell is not touched**; C3-03's split stands verbatim |
| 4 | `contract/05-lifecycle-invariants.md` — tier legend, `C3-03 is the last one found.` | Append one sentence — §4.4 |
| 5 | `contract/05-lifecycle-invariants.md` — F-47 table, row `` `landing({ duration })` thunk → `visual.animate()` `` | Replace the row — §4.5 |
| 6 | `contract/05-lifecycle-invariants.md` — F-47, `**One stated residue, deliberately not closed at C4-01, because closing it needs the frozen SPI.**` | Replace the whole paragraph — §4.6. **This is the mandatory half**: the paragraph asserts a false fact about the available shapes |
| 7 | `contract/05-lifecycle-invariants.md` — F-47, `Enumerating those one at a time does not terminate.` | Append: *"and that is why I-36's clause became a floor plus a register at review 4 rather than gaining a fourth site."* The paragraph already diagnoses the problem and stops one step short of the conclusion |
| 8 | `contract/01-construction-ownership.md` §Teardown — `calling nothing further, publishing nothing, and leaving any cache it was rebuilding in the retired state step 4 just put it in.` | Replace the clause — §4.7 |
| 9 | `contract/03-feature-composition.md` §`y()`/`xy()` — the paragraph beginning `**Anything the candidate loop calls may destroy the controller, and that stops the traversal**`, after its closing `see §[05](05-lifecycle-invariants.md) I-36.` | Append one sentence — §4.8, marking it a register ceiling |
| 10 | `ledger.md` L-12 — `**One residue is stated rather than closed**: \`landing()\`'s \`duration\` thunk is followed by \`visual.animate()\`, and \`LandingContext\` carries no liveness — closing it is a frozen-SPI question and is left as one.` | Replace with: *"**One residue is stated and, at review 4, classified.** `landing()`'s `duration` thunk is followed by `visual.animate()`; that is a real gap and it breaches none of I-36's five-act floor, so it is a **conforming residue** rather than an open defect. C4-01 recorded it as a frozen-SPI question, which was **wrong on the facts**: `FeatureContext` is behavior-owned, unexported and already carries `report`, so the remedy costs no frozen surface — measured **+6 B to +53 B** — and is deferred to Phase 18/21 behind Phase 21's re-base with a stated trigger. Review 4 also narrowed I-36's indirect clause itself from a quantifier over call sites, which is not dischargeable, to **provisioning over modules + a five-act floor + a register of named ceilings** — the correction the three previous narrowings were each a symptom of."* |
| 11 | `plan.md` — the bullet `**One residue is stated and deliberately not closed.**` under Checkpoint D | Replace: state the classification, the corrected fact about `FeatureContext` (behavior-owned, not the frozen SPI, not public), the measured **+6/+53 B**, the deferral to Phase 18/21 behind the re-base, and the trigger. **Do not leave the sentence "closing it means widening a frozen SPI type"** — it is the claim this decision falsifies |
| 12 | `plan.md` — add a row under Checkpoint D for this decision | *"Checkpoint D review 4 (the landing residue) — I-36's indirect-invocation clause was a quantifier over call sites and is now a floor plus a register."* Disambiguate as **"Checkpoint D review 4"** at first use; `plan.md` already does this for the C2-0x/C3-0x series and Checkpoint **C** reused those IDs |
| 13 | `plan.md` §Phase 18 — the deliverable bullet `**The terminal-barrier enumeration (I-36).**` | Add: *"The enumeration is per **module**, not per call site — I-36 (1). For each module that reaches consumer code, state which liveness reading it holds. Then, for each site, state whether it clears I-36 (2)'s five-act floor and whether you are declaring a ceiling for it; a site with no ceiling and no floor breach is a conforming residue and is stated, not patched. Do not enumerate DOM method names: that set is chosen by the consumer and does not terminate."* This is the acceptance test for the whole decision |
| 14 | `plan.md` §Phase 21 — the `**Re-base the size budgets rather than absorbing another change into them.**` paragraph | Add one sentence naming the deferred `FeatureContext.live` remedy at a measured **+6 B to +53 B** as the first change queued behind the re-base, with `complete` going 106 B → 53 B if it lands before one |
| 15 | `tests/COVERAGE.md` — the *Terminal barrier in a resolver sequence* blockquote, `reads the terminal latch **between** invocations and stops on the first closed reading (I-36, F-47).` | Append: *"The obligation is a five-act floor everywhere plus stronger promises at named sites (I-36 (2), (3)). The rows below split accordingly: floor rows and **ceiling** rows."* |
| 16 | `tests/COVERAGE.md` — *The indirect half* blockquote, `I-36's indirect-invocation clause covers **every DOM method the library calls on a consumer-owned node**, not only the named resolver slots.` | Replace the universal with: *"…reaches DOM methods the library calls on consumer-owned nodes and not only the named resolver slots — bounded, since review 4, by I-36's floor and register: these rows are ceiling rows for the candidate loop, whose no-geometry promise is stated at `contract/03` and in the README."* Leave the rows themselves alone |
| 17 | `tests/COVERAGE.md` — same group | Add the §6 case, labelled **conformance pin, passes against current source** — the residue's blast radius, not a barrier |

### Checked, no change needed — recorded so they are not re-swept

| File · anchor | Why unchanged |
| --- | --- |
| `contract/00-index.md` §Normative precedence and freeze | The bar is applied, not amended. This decision is a normative-wording change to 05/01/03, which the freeze governs by requiring an argument — made in §2–3 — not by forbidding |
| `contract/00-index.md` tier table, D-29, §Preserved from probe 1 | Generic tier definitions and a kernel-teardown citation; no per-invariant rating, no participant-half claim |
| `contract/05` — I-6 **Tier** cell | C3-03's split is correct and stands verbatim. The bound goes in the mechanism cell, which is where C3-03 itself put scope detail |
| `contract/05` — I-6 clause 3's headline `**no callback fires afterwards**` | Retained verbatim, for C3-03 §4's reason: it is load-bearing in ~6 places and **every one of them is kernel-sequenced** (`00:153`, `01:307`, `01:330`, `02:1002`, `02:1411`, `05:283`), so bounding the participant half leaves all six valid |
| `contract/05` — F-36, F-38 | Kernel-sequenced. `F-38`'s "violating I-6's 'no callback fires afterwards'" stays verbatim |
| `contract/05` — F-47's `**What is not closed.**` paragraph | The `panic()` reachability argument and the third-copy falsifier are untouched |
| `contract/03` — `InsertionRuntimeView` `live` row, and the fourth/fifth-widening record | Accurate. The sixth widening is not landing, so nothing is added. Whoever lands it later adds the row then |
| `README.md:57` | **Do not edit.** It is a register ceiling, it is true of the artifact after C3-01 and C4-01, and it makes no claim about `landing()`. That the README's strongest public statement is site-scoped rather than universal is evidence the register form is the one the library was already using |
| `src/**` | No source change. The 24 sites citing I-6/I-36 assert no tier and no quantifier; `landing.ts` gains no guard |
| `tests/**` besides `COVERAGE.md` | No assertion changes. One case is added (§6) |
| `L-11` | Untouched. Nothing here adds to the frozen public surface, so Phase 23's re-measurement is unaffected |

## 9 — What this decision does not close

- **The residue itself is not closed, it is classified.** `landing()` still calls `matchMedia` and `animate()` after the thunk. The remedy is decided (`FeatureContext.live`, §4.6), measured (§7), and deferred with a trigger. If someone lands it in Phase 18, this document is the shape; if nobody does, F-47 states it as conforming rather than as missing.
- **`FeatureContext.live` has an ordering constraint the implementer must respect.** `assemble()` runs before `rt` exists — `install` receives already-built slots — so the closure is late-bound and a factory that called `live()` at construction would throw. The "externally inert factory" rule already forbids that, but it is now load-bearing and should be said in `feature.ts`'s doc comment when the change lands.
- **A consumer-supplied `landing({ run })` runner is unguardable and stays so.** I-36 binds participants, not consumers. Under (3) that is now a positive statement rather than a hole: the site carries no ceiling and the floor is the consumer's own to breach.
- **`retarget`'s `getComputedStyle` → `animate()` pair is deliberately left alone.** `getComputedStyle` is a window method taking the element and is not consumer-overridable through it, so there is one consumer-reachable call and no pair; and the kernel brackets `retarget` on both sides (F-38). Recorded so the fifth reviewer finds it examined rather than missed.
- **C3-03's tier split is not reopened.** I-6 keeps `B for every call the kernel sequences, over a tier-C participant obligation (I-36)`. **Editing collision:** this decision edits the same two cells C3-03 §3.1/§3.2 wrote — I-36's invariant text and I-6's mechanism cell. C3-03 has landed, so this is a second edit to landed text, not a merge; **do not re-resolve C3-03**, and leave `checkpoint-d-3-resolution-c3-03.md` §3.2 as written, since resolution records are historical. Its claim that the indirect clause "is not new scope" is superseded here and the supersession is stated in §4.2 rather than in that file.
- **C2-01's mechanism is not undermined, and this strengthens one of its conclusions.** §2 is the third independent confirmation that the frozen SPI expresses what the behavior needs — and the first where the channel already existed. C2-01 §8's falsifier for keeping the latch behavior-owned (a third behavior-owned copy) is unchanged.
- **C4-01's nine landed readings are not undermined and none is removed.** The floor reclassifies a *missing* reading; it never licenses deleting a present one. Residue #2's three defence-in-depth readings stay for C2-01 §7's noise-band reason, and `release.effect`'s stops being defence in depth at all — under the floor it prevents acts 5 and 1 and is required.
- **The five-act floor is the first version of a rule, not a proof.** It was calibrated against three findings (§3) and it will meet a case that is arguably a sixth act — a consumer-observable side effect that is neither a publication nor a declared callback, a `scrollIntoView` or a `focus` on a node that outlives the operation. That is a **one-row edit to the list**, and the list is closed and checkable, which is the whole difference from what it replaces. Adding an act is a decision; finding a call site is not.
- **Whether the register should be a table.** Today it has two entries (`03:410`, `README:57`) named inline in I-36 (3). If it reaches four, it should become a table in `05` beside the F-47 enumeration. Not worth the churn at two.
- **Nothing is added to the frozen public surface.** Stated as a distinct consequence per the constraint: this decision adds nothing to any entrypoint, and the deferred remedy adds nothing either — `FeatureContext` is exported from no entrypoint, and `plan.md` records that keeping the authoring types out of the public import graph is why `SortableFeature` is declared where it is.
- **L-11, D2, D5, C3-01's return channel and I-7's precondition dependency on I-30** — all untouched.

### Verification

`src/` and `tests/` are clean. The prototype in §7 was applied to `src/sortable/feature.ts`, `src/sortable/behavior.ts`, `src/sortable/landing.ts` and `bench/size/measure.ts` (the last only to print exact bytes instead of rounded kB), measured, and restored from copies taken before the edit; `git status` afterwards shows exactly the files C4-01's implementation pass had already modified and none of the four. Production `tsc -p tsconfig.json --noEmit` was clean against the prototype; the fixture cost, for whoever lands it, is the several test files that build a `FeatureContext` literal or pass `null as unknown as FeatureContext` into a feature factory — the same species of fixture cost C2-01 §5 recorded, not design cost.
