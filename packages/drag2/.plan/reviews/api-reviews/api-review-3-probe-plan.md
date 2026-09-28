# API redesign v3 — pre-implementation probe plan

> **CLOSED — 2026-08-13.** Superseded for decisions by [`api-review-final-summary.md`](api-review-final-summary.md), recorded in the contract as **D-36…D-47**. Provenance only; the contract is the source of truth. Kept because the probe design and the disposition reasoning are what produced the evidence, and because three of its own conclusions were falsified — which is the useful part of the record.
>
> **Probes run: A, C1, E** (plus api-1, run inline). **Never run: B, C2, D.** Their questions were answered by owner decision instead — C-5's fragment shape by §9/D-45, the abandoned-resolver terminal by §4/D-40, the kernel authoring surface by §11/D-47. Their scenarios may become implementation acceptance tests.
>
> **Three things in this document are wrong, and are corrected in the contract, not here:**
>
> - **S-3 is half wrong.** It claims the destroy instance of the placeholder residue "mostly dissolves under A" once teardown defers. It does not. `prepare` completes but is never **adopted** — `preparationValid()` returns false and the seam reports `SEAM_INVALIDATED` — so the disposer registered in `effect` never runs and never becomes responsible. Deferral changes _when_ teardown happens, not _whether_ adoption occurred. `rollback` closes it, and **D-39 makes it required**. Probe A found this.
> - **C-2's correction to terminate post-release abandonment as `aborted` is reversed.** §4 keeps one `canceled` terminal (**D-40**). The reasoning: a second name would encode provenance, not a different consumer obligation — in both cases the consumer must not assume its own started work was undone, because the library never had a way to undo it. Probe A verified the abandonment path already reaches one terminal and consumes the late rejection safely.
> - **C-5 is superseded in full** by §9/D-45; see the supersession header on [`api-review-3-resolution-c5.md`](api-review-3-resolution-c5.md).
>
> **Two of its stop conditions fired, and the model survived both.** A2 (panic cannot be deferred) did **not** fire. A1 broke — statement-level liveness does not retire completely, four call sites are irreducible residue — and the answer was to change I-36's _domain_ rather than patch around it: **D-37**. Two published ceilings were withdrawn as the price.
>
> Original text follows, unedited.

Input: `api-review-3-summary.md`, treated as the current working hypothesis.

Task: reduce its twelve "remaining probe targets" to the **minimum set of executable falsifiers that must run before implementation starts**, settle whatever can be settled without a probe, and flag contradictions.

The bar the summary sets for itself is right and is adopted here:

> At this point a failed probe should change the model. Another prose objection without a falsifier should not.

The corollary it does not state, and which does most of the reduction below:

> **A probe whose result cannot change the model is not a probe.** It is a test of the implementation, and it belongs in the implementation's own suite, written after the thing exists.

Applying both, the twelve targets reduce to **five probes**, of which two can start today against unmodified `src/`, and three require one shared throwaway spike branch.

---

## Part 0 — the disposition table

| v3 target | Disposition | Where it goes |
| --- | --- | --- |
| 1. transaction bracket / deferred `destroy()` / panic | **PROBE A** (spike) | §4 |
| 2. placeholder partial-acquisition rollback | **Dissolves under A**; residue is one decision | §2 S-4 |
| 3. `items()` + `invalidate()` semantics | **PROBE B** (spike) | §4 |
| 4. semantic gap reconciliation | **Settled** by three existing test angles; only the _delivery_ is new | §2 S-2 → folded into B |
| 5. serial commit + post-commit re-anchor | **PROBE C** — but only the uncovered residue | §4 |
| 6. pre-lift `box`/`visual`, footprint, landing offset | **Settled today** (probe `api-1`), with a correction to §5 | §1, §3 C-3 |
| 7. `display: contents` / grid anchoring | **Settled today** (probe `api-1`) — becomes a scope limit, not a mechanism | §1 |
| 8. declarative fragment merge before materialization | **Settled by derivation** — with one real API consequence | §2 S-3 |
| 9. post-release cancellation closure | **Not empirical.** A contract decision, and the current draft is unsafe | §3 C-2 |
| 10. `onStart` → exactly one `onEnd` | **Not empirical.** Already answered by §3; §11 contradicts it | §3 C-1 |
| 11. custom behavior against `kernel/draggable` | **PROBE D** (spike, acceptance gate) | §4 |
| 12. pointer/keyboard interactive descendants | **PROBE E** (independent — start now) | §4 |

Seven of twelve leave the probe list. Nothing is dropped: each becomes either a measured fact (§1), a decision to record (§2), or a contradiction to resolve (§3).

---

## Part 1 — settled today by measurement

Probe `api-1` (`.plan/probes/api-1-box-anchor.md`) was run during this session against a static Chromium fixture with no library code. It closes targets 6 and 7, which had **zero** prior evidence in the repo.

**L-1. The footprint rule is a difference, and it needs a post-lift read.** With `item = <x-row display:contents>`, `box = .row-box`, `visual = .card`:

| rule | sibling remains | visual alone | correct |
| --- | --- | --- | --- |
| `box` height | 62 | 62 | no |
| `visual` height | 60 | 60 | only when the visual is the box's only content |
| `boxPre − boxPost` | **30** | **60** | **both** |

The list collapsed by exactly 30 and 60 respectively. §5's "pre-lift footprint removed by the visual" is the right _concept_; its prescribed **capture sequence is insufficient** — you cannot compute it from pre-lift readings alone. See C-3.

**L-2. `item.after(placeholder)` survives `display: contents`.** In flex, `item.after()` and `box.after()` produce byte-identical placeholder geometry. §5's open question resolves to "it does not matter"; keep the current anchor, which additionally survives the consumer detaching `box`.

**L-3. Grid does not compose with a nested visual.** A lifted `.card` leaves `.row-box` still occupying a grid cell, so placeholder insertion produces two cells for one item and shifts everything after it. Sizing cannot repair cell occupancy. Rule: **in grid, `box` must equal `visual`.**

**L-4. Rule-placed grids are unsupportable and undetectable.** With `grid-column` assigned by `:nth-child(even)`, inserting a placeholder relocated items _unrelated to the drag_. State the requirement positively — the container's visual order must follow DOM order — and do not attempt detection.

**L-5. The `slot` attribute copy is load-bearing.** A placeholder inserted next to a slotted item without the attribute is unassigned and measures `0×0` at the origin — which would then become the landing target. `src/sortable/placement.ts:63,87-91` must survive the redesign, copying from `item` (not `box`).

Residual, folded into probe C: whether the L-1 difference rule still holds during a live drag with `layoutAnimation()` transforming the same elements.

---

## Part 2 — settled without a probe

### S-1. Fragment inertness is already true. The cost is elsewhere.

§2 requires configuration/strategy fragments to be "inert before installation". `y()` at `src/sortable/y.ts:80-81` returns `brandFeature(factory)` where `brandFeature` is a pure cast (`src/sortable/feature.ts:195-197`) — `createRectIndex()` runs inside the factory, at install. **The current implementation already satisfies §2's inertness requirement.** No probe, no rewrite. (`landing()` validates `duration` at construction and can throw before install; that is not in §2's prohibited list and should stay.)

What §2 actually costs is different, and it is a real API change. `src/sortable/assemble.ts:66` **invokes** the factory and detects the collision at `:44` from the returned contribution. Last-wins requires selecting the winner _before_ invoking anyone — which requires a fragment to declare its slot identity **without being invoked**. A branded opaque function cannot.

> **Decided — see `api-review-3-resolution-c5.md`.** Three fragment kinds (config object / strategy fragment / plugin fragment), discriminated at zero runtime cost, merged by three different rules, with the winner selected before any installer runs. The slot tag stays **module-private**: first-party fragments claim atomic capability slots, third-party fragments are plugins, so D-30's opacity guarantee is untouched.

This also disposes of my round-3 R3-10 (orphaned `retire` on the losing fragment): with selection before invocation the loser is never constructed, so there is nothing to retire. `tests/sortable/assemble.browser.test.ts:329`, which today asserts the rejected contribution _is_ retired, becomes obsolete rather than violated.

### S-2. Gap reconciliation is settled; only its delivery is new.

Target 4 is covered from three independent angles — `sortable.browser.test.ts:1649-1822` (survive/cancel/rebase, `item-removed`), `composition.browser.test.ts:442-499` (same through the public surface, including mid-drag insertion), and `react.browser.test.ts:569-592` (a new keyed row mounted into the destination gap during the accepting commit). The _reconciliation algorithm_ is not in question. What changes is only how the library learns to run it. Fold into B.

### S-3. The placeholder-rollback target mostly dissolves under A.

The residue defect is pinned today at `tests/sortable/placement.browser.test.ts:99-117`: `data-drag-placeholder` is already on the consumer's element and never undone. But read why — the residue exists **because `destroy()` physically retires mid-`prepare`**. Under §3's deferred teardown, `prepare` runs to completion, the placeholder is adopted, and the existing disposer at `src/sortable/spec.ts:493-495` removes it. The destroy instance of the defect disappears with the mechanism.

What survives is narrower: the seam being _discarded_ (`preparationValid()` false at `src/kernel/seams.ts:401`) or the factory throwing after partial mutation. That is one decision, not a probe:

> **Decision required:** give the sortable activation transition a real `rollback` (the hook exists at `seams.ts:56`, invoked at `:402`; the sortable transition omits it, with a rationale at `spec.ts:455-458` that is true only for the library's own `<div>`). Model it on `acquireTopLayer` (`src/kernel/presentation.ts:380-470`), which already does exactly this.

Verified as part of A rather than as its own probe.

### S-4. Do not commission probes for saturated ground.

Reentrant `destroy()` and destroy-from-consumer-callback have ~25 existing call sites plus `tests/kernel/kernel.browser.test.ts:2635-2844`. `updateItems` version/identity/snapshot immutability is fully pinned (`sortable.browser.test.ts:1622-2131`). Feature collision, ordering and reverse-order retirement are saturated (`assemble.browser.test.ts`, 476 lines). Post-release `controller.cancel()` reaching `AT_CONSUMER` is pinned (`sortable.browser.test.ts:1267`, `kernel.browser.test.ts:2364-2421`). These constrain the redesign — they should be read as requirements — but re-probing them answers nothing.

---

## Part 3 — contradictions: resolved

**Status: all six resolved by the owner. C-1, C-3, C-4 and C-5 adopted as recommended; C-2 and C-6 adopted with corrections, recorded inline below.** Probes may now run against a model with no known internal contradiction.

Each was decidable without an experiment. Running probes against a self-contradictory model would have wasted the spike.

### C-1 (§3 vs §11) — `destroy()` and `onEnd` are already decided, in opposite directions.

§3: after destroy, "no new operation or **later lifecycle publication** is allowed." §11: "Whether destruction after `onStart` should still emit `onEnd` is intentionally left for a targeted lifecycle probe."

An `onEnd` is a lifecycle publication. §3 already forbids it, current behavior already matches (`composition.browser.test.ts:654`: destroy inside `onReorder` produces no terminal callback), and no experiment can decide it — it is a contract choice about what the consumer asked for when they said "stop".

> **Decided.** `destroy()` emits no `onEnd`. Say so in §11 and delete the probe. The `onStart → exactly one onEnd` invariant is stated with the controller-alive qualifier §11 already writes ("_and the controller itself remains alive_"); make that qualifier normative rather than parenthetical.

### C-2 (§8 vs §9) — the draft creates an operation with no escape.

§8 closes user cancellation at release: once `onReorder` has begun, Escape and `controller.cancel()` no longer act. §9 lists "**never-committing transitions**" as a case the React helper must be tested for.

Compose them: a `startTransition` that never commits leaves `await committed` pending forever. The proposal is frozen, cancellation is closed, the lifted visual is still `position: fixed` over the page, the placeholder is still in the list. The only exit is `destroy()`, which tears down the whole controller. The user's Escape key does nothing, permanently.

This is worse than the status quo, and deliberately so — `src/kernel/pointer.ts:47-70` keeps the cancellation lifetime alive past motion _precisely_ "so a consumer can still abandon a gesture whose resolver has not settled", pinned by `tests/kernel/lifetimes.node.test.ts:156-182`.

§8's argument is sound but proves something narrower than its conclusion. It shows the library cannot **undo consumer side effects** already initiated. It does not show the library cannot **stop waiting on the consumer**.

> **Decided (owner correction — terminate as `aborted`, not `canceled`).** Post-release `cancel()` remains available and means _library-side abandonment_: stop waiting for the resolution, restore the presentation, and terminate the operation as **`aborted`**. A later settlement of the resolver is consumed safely and otherwise ignored. The library makes no promise about consumer side effects already begun.
>
> The `canceled` arm would have been a false claim. `canceled` says the reorder did not happen; after `onReorder` has begun the library cannot know that — the consumer's `setOrder` may well have committed. `aborted` is §11's existing "no domain result exists" arm, and that is exactly the epistemic state: the operation terminated without the library learning an outcome.

Two consequences follow from routing abandonment into `aborted`, and both belong in §11 rather than in a probe.

**The `aborted` arm now has two producers** — a consequential internal failure after `onStart`, and post-release user abandonment — which a consumer branching on `onEnd` cannot distinguish. The pairing with `onError` is a fragile proxy (a fault emits `onError` first; an abandonment does not), because it requires the consumer to correlate two callbacks to read one outcome.

> **Consequence to record in §11:** the aborted arm carries a discriminator, e.g. `{ type: 'aborted', reason: 'abandoned' | 'failed' }`. This is one field, it is the only thing distinguishing "the user gave up" from "the library broke", and an application that reconciles optimistic state needs the distinction.

**The escape hatch must not depend on the resolver.** Abandonment has to restore presentation and terminate without awaiting the pending resolution, which is precisely the case probe C2 covers — a resolution settling into a kernel that has already moved on. C2 therefore gains an obligation: show that the abandoned resolver's settlement, including a rejection, is consumed without an unhandled rejection and without producing a second terminal.

§8's own probe target disappears. What remains is C2, which already existed.

### C-3 (§5 internal) — the prescribed capture sequence cannot compute the footprint it prescribes.

§5's sequence is `capture pre-lift {...} → then acquire faithful lift`, and separately requires the placeholder footprint to be "the pre-lift footprint removed by the visual". L-1 shows that quantity is `boxPre − boxPost` and is not derivable from pre-lift readings alone when `box ≠ visual`.

> **Decided.** Amend §5 to two captures — pre-lift beside the existing `getBoundingClientRect()` at `src/kernel/kernel.ts:899`, post-lift inside `activation.prepare` where `src/sortable/placement.ts:64-65` already measures. Cost: one extra forced layout per activation, once. Record it.

### C-4 (§6 vs §7) — "retained by reference" would weaken a currently guaranteed property.

§6: "The exact source may be retained by reference rather than shallow-copied… In-place mutation of the same array is outside the structural-change detection contract." §7: "After release, the proposal is frozen."

Today the caller's array is copied at call time, pinned at `sortable.browser.test.ts:1633`. Retention by reference makes a _frozen_ proposal observe a consumer's later in-place mutation of the same array, and the "outside the contract" clause converts a currently impossible corruption into undefined behavior in exchange for one allocation per structural change.

Note also that §6's identity test is what makes the copy cheap: a copy is taken only when `next !== current`, i.e. only on real structural change — never on the geometry-only path, which is the frequent one.

> **Decided.** Keep the copy, on the structural branch only. This is not defensive nannying of the kind §4 rightly rejects; it is the library owning the data its own frozen proposal is derived from.

### C-5 (§2 vs implementation) — last-wins needs a pre-invocation identity.

See S-1.

> **Decided.** Configuration/strategy fragments carry a slot identity that can be read without invoking the installer; plugin fragments stay opaque. The winner is selected before any installer runs, so a losing fragment is never constructed and has nothing to retire. `assemble.browser.test.ts:329` becomes obsolete rather than violated. **The fragment shape must be fixed before probe B**, whose fixture has to construct fragments.

### C-6 (§1 vs packaging) — the kernel surface is a product requirement; its shape is the open question.

`tests/consumer.node.test.ts:628` asserts the package declares **no subpath into the kernel**. §1 proposes `@ydinjs/drag/kernel`.

> **Decided (owner correction — publication is not in question).** Custom behavior authoring through a supported low-level kernel surface is a **product requirement**, not a cost to be deferred. The `consumer.node.test.ts:628` assertion is an obsolete pin to be updated by the redesign, not a constraint on it.
>
> Probe D's job is therefore narrower and sharper than "should we publish": determine the **minimum public vocabulary** a real third-party behavior needs, and **falsify the proposed factory boundary** — `draggable(root, (host) => ({ spec, controller }))`. Publication is reopened only if D demonstrates that the required surface is untenable to support.

That reframing changes what a D failure means, and it is worth stating precisely, because "untenable" must not become a synonym for "large". D falsifies the boundary if a real behavior cannot be written without reaching for something the factory does not hand it, or if the minimum surface is only expressible by exporting internals whose shape the kernel must stay free to change — the frame/seam machinery in particular. A merely _wide_ surface is a documentation cost, not a falsification.

This also raises D's status. It is no longer only an acceptance gate on A; it is the sole falsifier for a stated product requirement, and the vocabulary it settles becomes public compatibility surface. Its output should be an explicit export list, not a verdict.

---

## Part 4 — the minimum falsifier set

Five probes. Two kinds, and the distinction drives the schedule:

- **Observation probes** run against unmodified `src/` or plain DOM. Cheap, start immediately.
- **Spike probes** require a throwaway implementation of the thing being tested. Expensive. They share **one** branch, staged, and that branch is discarded.

```text
now, in parallel, no dependencies
    C1  adversarial commit + re-anchor        (observation, current src)
    E   input policy                          (observation, current src)

spike branch, strictly ordered
    A   transaction bracket + deferred destroy + panic
         │
         ├─→ B   items() + invalidate() + reconciliation delivery
         │
         ├─→ C2  destroy / unmount mid-resolution
         │
         └─→ D   runtime kernel-authored behavior   (acceptance gate, last)
```

Nothing but A can run first on the branch: B's re-read timing, C2's teardown semantics and D's factory/arming shape are all statements _about_ where the transaction boundary is.

---

### Probe A — the transaction bracket, deferred `destroy()`, and `panic()`

**Question.** Can a single revalidation at a transaction boundary replace the ~33 consumer-facing liveness call sites, and what happens to `panic()`?

**Start from the finding that most of it already exists.** `drain` (`src/kernel/queue.ts:68-92`) already refuses re-entry, owns the outermost frame, and re-reads `queue.closed` every iteration; `openIngress` (`kernel.ts:825-848`) is a second, hand-rolled bracket with its own `admitting` latch and deferred drain, and its doc comment at `kernel.ts:305-322` is essentially a prose statement of §3's proposal. The scope is therefore **much smaller than §3 implies**: generalize the two existing brackets into one primitive, and route through it the three things they do not cover — `destroy()` (deliberately un-queued, `kernel.ts:492`), the synchronous `activate()` call from `handleMove` (`kernel.ts:1693`), and the custom-element callback windows that run inside raw DOM writes (`spec.ts:496`, `:812`, `:1239`).

**Falsifiers — any one changes the model:**

1. **The 18 `live()` calls do not all die.** They exist because consumer code runs synchronously _inside_ library DOM writes — `connectedCallback` at `spec.ts:496`, an overridden `style` accessor at `placement.ts:99`, `offsetWidth` on a custom element at `:64`. Deferred destroy removes the _destroy_ path through them. Enumerate what else reaches them (`cancel()` latching, a classified failure, a throw) and show each is either impossible inside the bracket or harmless. If a residue survives, §3's headline claim is overstated and the stretch/reach analysis is not retired.
2. **`panic()` cannot be deferred.** `kernel.ts:531-534` — `panic` _is_ `destroy()`, it is reached from `queue.ts:87` when a throw escapes the drain, and it bypasses the behavior's `rt.closed` latch entirely (documented at `src/sortable/runtime.ts:127-131`). Deferring a panic to the boundary means continuing to run library code after an unexplained throw. Not deferring it reintroduces mid-stack physical teardown — the exact thing §3 removes. §3 calls this "the hardest exceptional path"; it is the single most likely result to change the model.
3. **Exception safety.** §3 requires the validity set to be exception-safe. Show the bracket unwinds correctly when the consumer throws from inside it, and that a `destroy()` requested _before_ that throw still completes.
4. **The `Promise<void>` is honest.** §3 promises synchronous physical teardown for the ordinary non-reentrant case. Verify, and verify the promise settles exactly once for concurrent `destroy()` calls.

**Also verified here (S-3):** the activation `rollback` that makes placeholder mutation all-or-nothing.

**What it does not claim.** Not a performance result.

---

### Probe B — `items()` + `invalidate()`

**Question.** Does pull-plus-invalidation preserve the reconciliation behavior that is currently pinned against push?

**Falsifiers:**

1. **Re-read timing.** `invalidate()` called from inside a library transaction (a `useLayoutEffect` that runs during a commit the library is waiting on; sketch A calls it from inside `onReorder`). When is `items()` actually invoked? If it is invoked synchronously, the library calls consumer code from inside its own bracket — the pattern probe A exists to remove. If it is deferred to the boundary, show the geometry rebuilt afterwards is not stale for the frame in between.
2. **`items()` throws, or returns garbage.** The push API validated at the dispatch site (duplicate element refused, `sortable.browser.test.ts:1911`) and could report a classified failure to a caller. A pull source is read at a library-chosen moment with no caller to report to. Where does that failure go? This is a genuine capability question, not a detail.
3. **The identity convention under React.** §6 requires a fresh array on structural change and the same array otherwise. Sketch B rebuilds `committedItems.current` with `.map().filter()` in a `useLayoutEffect` keyed on `[order]` — **a fresh array every time `order` changes, including when the change is the library's own accepted reorder**. Confirm this does not make every accepted drop look like an external structural change and trigger reconciliation against its own commit. If it does, the convention is too subtle to hand to consumers and needs a library-side structural comparison.
4. **Reconciliation parity.** Re-run the pinned scenarios from `sortable.browser.test.ts:1649-1822` through the pull path; identical outcomes.
5. **Stationary drag.** The case that killed pure pull (a held drag with no pointer motion, remote edit arrives): confirm `invalidate()` alone drives the update with no frame task.

---

### Probe C — the consumer commit window

**C1 (now, current `src/`) — adversarial renderers.**

The re-anchor is covered for React (`react.browser.test.ts:480-702`, `.plan/react-placeholder-probe.md`). Grep confirms `replaceChildren`, `innerHTML` and `createPortal` appear **nowhere** in `tests/` or `src/`. §9 explicitly widens the promise — "an imperative renderer may move or detach the placeholder entirely" — and sketch A's own `for (const item of items) root.append(item)` loop pushes the placeholder to index 0.

Falsifiers: for each of `replaceChildren`, `innerHTML = ''` + rebuild, an append-loop, and a morphdom-style patch, does the placeholder end up correctly re-anchored and does the landing target match the item's final rect? Also the §9 case where the consumer's commit **removes the container** the placeholder was in.

Include the L-1 residue: does `boxPre − boxPost` still hold with `layoutAnimation()` transforming the same elements?

**C2 (after A) — teardown during the consumer round-trip.**

`destroy()` or a React unmount while `onReorder`'s promise is pending. Today the resolution `AbortController` fires (`kernel.ts:1598-1607`) and a signal-aware waiter rejects into a kernel that is gone — an unhandled rejection with no owner. Falsifier: show where that rejection lands under the new model, and that sketch B's `await committed` does not produce one when the component unmounts.

---

### Probe D — a real behavior authored against `draggable(root, factory)`

**Question.** Does §1's factory shape work at runtime, and how much kernel vocabulary must be public?

Existing evidence is strong but has a specific hole: `kernel.browser.test.ts` authors non-sortable behaviors, but synthetically, from inside the package; `tests/probes/13c-free-drag.ts` writes a complete second behavior at **type** level and its own write-up says it is not lifecycle validation. It found two structural gaps (activation typed for an `HTMLElement`; landing origin derived from the pointer) that a runtime probe would have exercised.

**Falsifiers:** implement free drag as a **runtime** behavior through the §1 factory. Does the factory receive everything it needs before it must return `{ spec, controller }`? Do 13c's two gaps reproduce? Is any part of the minimum surface expressible only by exporting internals the kernel must stay free to change?

**Deliverable:** an explicit export list, not a verdict. Per C-6, publication is a product requirement; D settles the vocabulary and the boundary, and reopens publication only if the required surface proves untenable to support — where _untenable_ means "cannot be held stable", never "turned out to be large".

Runs last: it is the acceptance gate for A, and the sole falsifier for §1's authoring requirement.

---

### Probe E — input policy (start now, independent)

The emptiest target and the only user-visible one. Verified by grep across all of `tests/`: **zero** occurrences of `createElement('button'|'a'|'input')`, `contentEditable`, `tabIndex`, `.focus()`, `isComposing`, or any modifier-key property. `tests/kernel/pointer.browser.test.ts` is 54 lines about `acquirePointerCapture` only.

Concrete open behavior: `preventDefault()` fires at admission (`kernel.ts:682-719`) — **before** the activation threshold — so a `pointerdown` on a nested `<input>`, a link, or selectable text inside a draggable row is defaulted away even for interactions that never become drags.

This probe is independent of the entire lifecycle redesign and gates release on its own. It should not wait for the spike branch, and its results should not be allowed to reopen the lifecycle model.

---

## Part 5 — deliberately not probed

These belong in the implementation's test suite, written against the real thing:

- the two-fault terminal gap already documented at `.plan/contract/02-kernel-behavior-contract.md:525` (a cancel latched from a custom placeholder's `connectedCallback` plus a throwing `invalidateInsertion()` yields a terminal for a drag whose start was never notified) — a known bug with a known shape, not an open question;
- a literal `keydown{Escape}` after `pointerup` with a pending resolver — the lifetime evidence at `lifetimes.node.test.ts:156-182` already implies the answer, and C-2 changes the surrounding contract anyway;
- `DraggableError` code taxonomy — a naming decision, unfalsifiable;
- landing `duration({ distance, from, to })` — explicitly deferred by §10, and §10's reasoning stands;
- cross-browser confirmation of `api-1`'s box-model results — worth one pass, not a gate.

---

## Part 6 — sequence and stop conditions

1. ~~**Resolve C-1 … C-6 on paper.**~~ **Done** — see Part 3. C-2 and C-5 changed what the spike must implement; C-6 changed what probe D is for.
2. **Start C1 and E now**, in parallel, against current `src/`. Neither needs the spike. C1 can already falsify §9's commit-window promise.
3. **Cut one spike branch.** A → then B and C2 → then D. Discard the branch afterwards; its output is findings, not code.
4. **Stop conditions.** A failure in A2 (panic) or B3 (React array identity) halts and returns to design — both invalidate a load-bearing claim rather than adjust a detail. A failure in C1, C2 or D is a scope or contract adjustment, not a redesign. **Do not patch around a failed model.** A stop condition that is met is a design result, not an obstacle: the spike exists to produce that finding cheaply, and a workaround discovered inside a throwaway branch is evidence about the workaround, not about the model.
5. **After the five probes, implementation starts.** Everything in Part 5 is written as the implementation lands, not before it.

Note that steps 1 and 2 together already produce a decision-grade result without touching `src/` — which is the cheapest possible way to discover that the model needs another round.

---

## Appendix — what this plan assumes about the summary

Adopted without challenge: §10 (library-owned landing), §12 (error object), §13 (faithful lift), §4's three-way split between ownership validation, library write verification and acquisition safety, and §7's retention of `before`/`after` neighbour identity. These absorbed the three review rounds and nothing in this plan reopens them.

Not re-litigated, but noted as the largest un-probed assumption in the document: §9's claim that serializing the authored commit ahead of landing costs only latency. No probe here measures that latency, and none should — the argument that it is acceptable is a product judgement, and it was made deliberately.