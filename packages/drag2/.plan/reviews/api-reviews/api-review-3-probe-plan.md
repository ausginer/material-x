# API redesign v3 — pre-implementation probe plan

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

> **Decision required:** configuration/strategy fragments become a tagged pair — an identity plus an uninvoked installer — while plugin fragments stay opaque. This is exactly §2's own two-category split, made load-bearing at the type level. The tag becomes public surface for third-party strategy authors.

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

## Part 3 — contradictions to resolve before any probe runs

Each of these is decidable now. Running probes against a model with an internal contradiction wastes the spike.

### C-1 (§3 vs §11) — `destroy()` and `onEnd` are already decided, in opposite directions.

§3: after destroy, "no new operation or **later lifecycle publication** is allowed." §11: "Whether destruction after `onStart` should still emit `onEnd` is intentionally left for a targeted lifecycle probe."

An `onEnd` is a lifecycle publication. §3 already forbids it, current behavior already matches (`composition.browser.test.ts:654`: destroy inside `onReorder` produces no terminal callback), and no experiment can decide it — it is a contract choice about what the consumer asked for when they said "stop".

> **Recommendation:** `destroy()` emits no `onEnd`. Say so in §11 and delete the probe. The `onStart → exactly one onEnd` invariant is stated with the controller-alive qualifier §11 already writes ("_and the controller itself remains alive_"); make that qualifier normative rather than parenthetical.

### C-2 (§8 vs §9) — the draft creates an operation with no escape.

§8 closes user cancellation at release: once `onReorder` has begun, Escape and `controller.cancel()` no longer act. §9 lists "**never-committing transitions**" as a case the React helper must be tested for.

Compose them: a `startTransition` that never commits leaves `await committed` pending forever. The proposal is frozen, cancellation is closed, the lifted visual is still `position: fixed` over the page, the placeholder is still in the list. The only exit is `destroy()`, which tears down the whole controller. The user's Escape key does nothing, permanently.

This is worse than the status quo, and deliberately so — `src/kernel/pointer.ts:47-70` keeps the cancellation lifetime alive past motion _precisely_ "so a consumer can still abandon a gesture whose resolver has not settled", pinned by `tests/kernel/lifetimes.node.test.ts:156-182`.

§8's argument is sound but proves something narrower than its conclusion. It shows the library cannot **undo consumer side effects** already initiated. It does not show the library cannot **stop waiting on the consumer**.

> **Recommendation:** split the two. Post-release `cancel()` remains available and means _library-side abandonment_: stop waiting for the resolution, restore the presentation, terminate as `canceled`, and explicitly promise nothing about consumer state — the consumer's own `setOrder` may well have landed. That keeps the escape hatch, keeps the existing tested reachability, and concedes §8's actual point in the contract wording. Then §8's probe target disappears too.

### C-3 (§5 internal) — the prescribed capture sequence cannot compute the footprint it prescribes.

§5's sequence is `capture pre-lift {...} → then acquire faithful lift`, and separately requires the placeholder footprint to be "the pre-lift footprint removed by the visual". L-1 shows that quantity is `boxPre − boxPost` and is not derivable from pre-lift readings alone when `box ≠ visual`.

> **Recommendation:** amend §5 to two captures — pre-lift beside the existing `getBoundingClientRect()` at `src/kernel/kernel.ts:899`, post-lift inside `activation.prepare` where `src/sortable/placement.ts:64-65` already measures. Cost: one extra forced layout per activation, once. Record it.

### C-4 (§6 vs §7) — "retained by reference" would weaken a currently guaranteed property.

§6: "The exact source may be retained by reference rather than shallow-copied… In-place mutation of the same array is outside the structural-change detection contract." §7: "After release, the proposal is frozen."

Today the caller's array is copied at call time, pinned at `sortable.browser.test.ts:1633`. Retention by reference makes a _frozen_ proposal observe a consumer's later in-place mutation of the same array, and the "outside the contract" clause converts a currently impossible corruption into undefined behavior in exchange for one allocation per structural change.

Note also that §6's identity test is what makes the copy cheap: a copy is taken only when `next !== current`, i.e. only on real structural change — never on the geometry-only path, which is the frequent one.

> **Recommendation:** keep the copy, on the structural branch only. This is not defensive nannying of the kind §4 rightly rejects; it is the library owning the data its own frozen proposal is derived from.

### C-5 (§2 vs implementation) — last-wins needs a pre-invocation identity.

See S-1. Resolve the fragment shape before probe B, because B's fixture has to construct fragments.

### C-6 (§1 vs packaging) — publishing the kernel is a compatibility decision, not a layering one.

`tests/consumer.node.test.ts:628` asserts the package declares **no subpath into the kernel**. §1 proposes `@ydinjs/drag/kernel`. That is a deliberate reversal and its real cost is that the kernel SPI — currently free to churn, and the substrate the whole redesign is about to churn — becomes public compatibility surface at the same moment.

> **Recommendation:** do not publish `kernel/*` in the first stable release. Keep probe D (it decides how much vocabulary _would_ need to be public, and validates §1's factory shape either way), but treat the subpath export as a separate, later decision. §1's layering claim survives intact; only the publication date moves.

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

Existing evidence is strong but has a specific hole: `kernel.browser.test.ts` authors non-sortable behaviors, but synthetically, from inside the package; `docs/probes/13c-free-drag.ts` writes a complete second behavior at **type** level and its own write-up says it is not lifecycle validation. It found two structural gaps (activation typed for an `HTMLElement`; landing origin derived from the pointer) that a runtime probe would have exercised.

**Falsifiers:** implement free drag as a **runtime** behavior through the §1 factory. Does the factory receive everything it needs before it must return `{ spec, controller }`? Do 13c's two gaps reproduce? What is the minimum export set — and is it small enough to be worth publishing at all (C-6)?

Runs last: it is the acceptance gate for A, and its answer feeds the kernel vocabulary decision rather than the lifecycle model.

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

1. **Resolve C-1 … C-6 on paper.** None needs an experiment; two of them (C-2, C-5) change what the spike must implement.
2. **Start C1 and E now**, in parallel, against current `src/`. Neither needs the spike. C1 can already falsify §9's commit-window promise.
3. **Cut one spike branch.** A → then B, C2, D. Discard the branch afterwards; its output is findings, not code.
4. **Stop conditions.** A failure in A2 (panic) or B3 (React array identity) should halt and return to design — both would invalidate a load-bearing claim rather than adjust a detail. A failure in C1, C2 or D is a scope or contract adjustment, not a redesign.
5. **After the five probes, implementation starts.** Everything in Part 5 is written as the implementation lands, not before it.

Note that steps 1 and 2 together already produce a decision-grade result without touching `src/` — which is the cheapest possible way to discover that the model needs another round.

---

## Appendix — what this plan assumes about the summary

Adopted without challenge: §10 (library-owned landing), §12 (error object), §13 (faithful lift), §4's three-way split between ownership validation, library write verification and acquisition safety, and §7's retention of `before`/`after` neighbour identity. These absorbed the three review rounds and nothing in this plan reopens them.

Not re-litigated, but noted as the largest un-probed assumption in the document: §9's claim that serializing the authored commit ahead of landing costs only latency. No probe here measures that latency, and none should — the argument that it is acceptable is a product judgement, and it was made deliberately.