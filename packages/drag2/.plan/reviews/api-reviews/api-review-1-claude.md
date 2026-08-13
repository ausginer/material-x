# API review 1 — the public surface, stress-tested

**Independent architectural review of the `@ydinjs/drag2` public API.** Findings and trade-offs only; nothing here is a redesign, and nothing here is a decision. Every existing API decision was treated as challengeable rather than settled, including ones the frozen contract records as closed — the freeze governs the _kernel–behavior SPI_, and this review is about the _consumer_ surface, which contract 00's admissible-change rule does not cover.

**What was read.** The nine public entry modules and everything they re-export; `assemble.ts`, `behavior.ts`, `controller.ts`, `domain.ts`, `feature.ts`, `placement.ts` and the seam sites in `spec.ts` that publish to the consumer; contract `01` and `03` in full, and `02`'s consumer-facing sections (settlement and readiness, failure classification, cancellation stages, the runner obligation, ingress and `preventDefault`, queue semantics); contract `00`; `README.md` §Option domains, §Export topology, §Migrating; `ledger.md` in full; `plan.md` Parts I and II; `tests/consumer.node.test.ts`, `tests/sortable/options.node.test.ts`, `tests/sortable/react.browser.test.ts`, `tests/sortable/composition.browser.test.ts`; `src/sortable.stories.tsx` and `src/stories.module.css`; and the shipped `@ydinjs/drag` option surface for comparison.

**What this review is not.** It does not re-open Checkpoint D, does not touch the I-36 defect set on its merits, and does not evaluate the kernel. Where a Checkpoint D finding is cited it is cited as _evidence of what a public contract costs_, never as a defect claim of its own.

---

## Summary

| # | Finding | Class | Consequence |
| --- | --- | --- | --- |
| **A1** | Reentrant `destroy()` from arbitrary consumer code is a promised, defined behavior | machinery magnet | The single largest cost centre in the package. Six review passes, an invariant that has been re-narrowed four times, 62 enumerated stretches, `live()` on three view types, and it is open today |
| **A2** | `visual()` puts a consumer callback inside the geometry candidate loop | machinery magnet | The proximate cause of most of A1's sites; also a documented foot-gun the type permits |
| **A3** | The collection is consumer-owned, versioned and pushed through `updateItems` | machinery magnet | Generates the entire reconciliation subsystem, and the consumer still writes the sync boilerplate by hand |
| **A4** | `landing({ run })` publishes five types for one escape hatch | machinery magnet | The ergonomic case it existed for is now covered by `duration: () => number` |
| **A5** | Feature composition buys ~826 B of differential, 742 B of it from two features | machinery magnet | Six of the eight feature functions carry no shakeable code; two of the eight are mandatory |
| **B1** | "Every option is validated at construction, at the call that introduced it" is false for two of the four options, and the stated discriminator does not discriminate | **overclaim, verified** | Asserted in four documents including the normative contract; the test drives an internal function and structurally cannot detect it |
| **B2** | The four controller methods have four different post-`destroy()` behaviors, and one validates conditionally on controller state | asymmetry | Consumer must memorise which is which; the same invalid call throws or is silent depending on state |
| **B3** | The README states I-36 guarantees without the tier and residue the contract attaches to them | **overclaim** | Consumer-facing promises presented as unqualified while the contract rates the same rule tier C and review 6 reports open breaches |
| **B4** | `DragErrorContext.domain` is non-null for 1 of 14 failure stages | accidental shape | And its existence is the stated reason the error type could not ship from `drag.js` — an almost-always-null field decided an entry-topology question |
| **B5** | Admission calls `preventDefault()` on every admitted press, before any drag exists, and the click consequence is explicitly undecided | **undefined public behavior** | The first thing a consumer with clickable rows meets, and the contract declines to answer it |
| **C1** | The public vocabulary is inverted relative to consumer need | asymmetry | 14 failure constants exported (mostly logged); 5 cancel-reason strings unexported (most plausibly branched on) |
| **C2** | `threshold` and `readinessTimeout` live on `callbacks()` | asymmetry | Options placed by who owns the default, not by what they configure |
| **C3** | Omitting a feature is sometimes fatal, sometimes silently degrading | asymmetry | No axis throws; no `landing()` silently removes the drop animation a migrating consumer had |
| **C4** | `handle()` and `visual()` share a subpath but share almost nothing else | asymmetry | Different nullability, different call frequency by three orders of magnitude, different failure semantics |
| **C5** | `reject(reason, { presentation: true })` is expressible, reaches the gate, is undocumented and untested | under-specified symmetry | An unexercised public path through the settlement protocol |
| **C6** | `ReorderRequest` carries three encodings of one fact | reasoning cost | Consumer must be told which is authoritative; library must keep all three correct |
| **C7** | The minimal composition is four imports from four subpaths and four nested calls | ergonomics | Against one import and one call in the shipped package; the entry split buys tree-shaking no second behavior exists to use |

Findings are ordered by how much implementation, lifecycle and testing complexity each one is responsible for, not by how visible each is to a consumer.

---

# A — Machinery magnets

## A1 — Reentrant `destroy()` as a defined, guaranteed behavior

**What the API promises.** A consumer may call `controller.destroy()` from inside any callback the library invokes, and the library will stop cleanly at that call. The README states it as a deliberate difference from the shipped package (`README.md`, _deliberate differences_), and extends it explicitly past declared callbacks:

> **The same holds for a composition that installs no `visual()` at all**: the library also calls `getBoundingClientRect()` on your rows and on your placeholder, and an override of it on a custom element is your code too, so destroying from one of those stops the traversal at exactly the same point.

**What it costs.** This is the most expensive sentence in the package, and the cost is documented rather than inferred:

- Five Checkpoint D review passes have each found the previous fix incomplete one level down (`plan.md` §Checkpoint D, reviews 2–5, and review 6 is open).
- The governing invariant has been re-narrowed four times: a quantifier over call sites → provisioning + a five-act floor + a register of ceilings → **bimodal** provisioning with named kernel brackets. `plan.md:816` states the reason plainly — read literally the clause "governed every overridable member of every consumer-owned node — a set the consumer chooses, which cannot be enumerated".
- The discharge artifact is a **62-stretch table across 20 modules** (`plan.md:830`), adopted as a Checkpoint D closure obligation because "a checkpoint cannot honestly close over an artifact nobody has swept".
- The mechanism is threaded through three consumer-declared view types — `InsertionRuntimeView.live`, `DisplacementView.live`, `PlaceholderSlot`'s second parameter — recorded as the fourth and fifth _additive widenings_ of D-13's view contract.
- `RectIndex.refresh` returns `boolean` solely to carry an abort (`plan.md:805`).
- Both axis features must independently thread the reading, and `xy.ts:66-72` states that a future third axis has to as well.
- The sweep that was meant to close it found **nine defects across eleven stretches, seven of them new** (`plan.md:831`), at modules that already held readings.
- Review 6 currently reports five further sites (C6-01…C6-05).

**What the consumer gets for it.** The ability to destroy the controller from inside a `getBoundingClientRect` override without leaving residue. I could find no consumer site — story, test fixture, or otherwise — that does this outside the regressions written specifically to prove the guarantee. The demand for it is entirely internal.

**Where the boundary could move, and what each direction costs.**

The public contract has one degree of freedom that has not been used: **whether reentrant `destroy()` is synchronous**. Today it is, and the whole apparatus exists to make every partially-executed library sequence safe against a teardown that has already completed underneath it. If a `destroy()` raised from inside a library-invoked stretch instead _latched and deferred_ to the end of the current dispatch, every one of those 62 stretches would run to completion against a live controller and the question "does anything this stretch does survive the stretch?" would not arise.

| Direction | What it buys | What it costs |
| --- | --- | --- |
| Keep synchronous reentrant `destroy()` | The current guarantee, unchanged; no migration | The floor, the register, the stretch table, per-site readings, and the standing obligation on Phase 18 to redo the whole enumeration for free drag (`plan.md:853`) |
| Defer teardown when `destroy()` is reentrant | One latch replaces the provisioning rule. The stretch table becomes unnecessary rather than merely discharged. Phase 18's enumeration deliverable disappears | The promise weakens to "synchronous from outside a library callback; applied at end of dispatch from inside one". A consumer that destroys and immediately re-arms a new controller on the same root within the same synchronous block would observe the old controller's DOM still present. React StrictMode double-invoke and rapid remount are the realistic exposure |
| Declare reentrant `destroy()` unsupported | Cheapest of all | Dishonest: the library cannot prevent it, and undefined behavior in a teardown path is worse than a weaker defined one |

The second row is the one worth pricing. **Phase 18 is the forcing point**: it carries a deliverable to enumerate free drag's consumer-reaching stretches in the same form, and `plan.md:853` names a third copy of the latch as the stated falsifier for keeping the mechanism behavior-owned. Deciding this before Phase 18 rather than after is the difference between paying for the enumeration once and paying for it twice.

**Honest counter-argument.** The guarantee is not arbitrary — it descends from I-6, "synchronous and terminal `destroy()`", which is a preserved probe-1 result and matches the shipped package. And the _seven new_ defects the sweep found were real: publications into a scrubbed frame that would have leaked into the next drag (I-20). Those are genuine bugs regardless of the guarantee's shape. What deferral changes is not whether they were bugs, but whether the class can recur — a deferred teardown makes "published into a retired runtime" unreachable rather than individually guarded.

---

## A2 — `visual()` is a consumer callback inside the geometry candidate loop

**What the API is.** `visual(resolve: (item: HTMLElement) => HTMLElement)` (`handle.ts:53`). One line, no state.

**What it actually costs.** Its docstring is the finding:

> **Called for every candidate, not only the dragged item** (parity D2). The axis rule searches candidate _visuals_ … So a resolver must map each item to _its own_ visual — a `() => oneFixedElement` resolver is wrong here, and was wrong in the shipped package for the same reason.
>
> It sits on the geometry path: once per candidate per rebuild … Keep it a lookup, not a query.

Three separate costs are stacked here:

1. **It is the reason the candidate loop reaches consumer code at all** — which is C2-01, C3-01 and C4-01's site, i.e. three of the six Checkpoint D review passes.
2. **The type permits the documented wrong answer.** `(item) => HTMLElement` is satisfied by `() => oneFixedElement`, and the consequence is not an error but a silently biased hysteresis boundary — L-10's own finding, "it silently moves where every gap is crossed".
3. **It forced `getVisual` onto the per-operation view** (`runtime.ts:59-64`), copied off the slots once per operation, so the axis feature could reach a resolver it must not import.

**Where the boundary could move.** The public contract choice is between _a function the consumer supplies_ and _a declaration the library resolves_. A declarative form — an attribute or selector convention the library reads itself — removes the declared callback from the loop. What it does **not** remove is the indirect exposure: `getBoundingClientRect()` on a consumer element is still consumer-overridable under I-36's own clause, so this narrows A1's surface rather than dissolving it. It also loses the ability to resolve a visual by arbitrary consumer logic (a lookup in a framework-owned map, for instance), which the story does not need but a real integration might.

**Trade-off, stated plainly:** the callback form is more expressive and costs a consumer-code call site inside the hottest first-party loop; the declarative form is cheaper to make safe and cannot express a computed mapping. This is a genuine choice, not a defect — but it has never been priced, because `visual()` was retained as a parity row (`ledger.md` §2) rather than re-derived.

---

## A3 — The consumer-owned, versioned collection

**What the API is.** `sortable(items: readonly HTMLElement[], …)` takes a snapshot; `controller.updateItems(items)` replaces it; `version` is minted by the controller and surfaces on `CollectionSnapshot`, `ReorderRequest` and `ReorderProposal`.

**What it generates on the library side.** `reconcileCollection` with four survival rules, `copyUniqueItems` with duplicate rejection, the `TAG_COLLECTION` behavior action and its per-phase staging table, D-25's publish-then-cancel rule (a whole decision whose only job is to stop an invalidating update from being discarded), `CHANGE_REBASE`/`CHANGE_CANCEL`, the monotonic version counter with its own correctness argument about two updates in one drain (`controller.ts:45-50`), and the `CANCEL_COLLECTION_INVALIDATED` / `CANCEL_ITEM_REMOVED` cancellation paths.

**What it generates on the consumer side.** The survey of real call sites found this recurring in _both_ the story and the React fixture:

- an `elements` map fed by `ref` callbacks, set on non-null and deleted on null;
- an `items()` projection mapping order state through that map and filtering nulls;
- `updateItems(items())` after every authored commit;
- an `orderRef` mirror of the order state so `onReorder` does not read a stale closure;
- `flushSync` around the initial mount, because "the controller cannot be armed against elements that do not exist yet, and `render()` is concurrent".

That is five distinct pieces of boilerplate, present in every consumer, in service of keeping the library's copy of a list in step with the DOM the library is already looking at.

**Where the boundary could move.** The library already knows the placeholder's parent and already reads every candidate's geometry. A contract in which the collection is _derived_ — from the root, from child order, from a selector — would delete the reconciliation subsystem and the version, and delete all five boilerplate items.

**What that costs, honestly:**

- Items need not be siblings, and need not be direct children of the root. A derived collection has to state a containment rule the array form does not need.
- During a drag the DOM contains the library's own placeholder, and under an authored-presentation commit the consumer's render and the library's placeholder occupy the same parent. Deriving the collection from live DOM means the library must exclude its own artifacts from its own reading — which is a smaller problem than reconciliation but not a free one.
- Identity-based reconciliation is a _preserved probe-1 result_ and a parity row. Removing it is a real capability change, not a simplification.
- `updateItems` is the only route by which a consumer can tell the library about a change it cannot see — a virtualised list, an off-DOM reorder. Deriving removes that route.

**The honest reading:** this is the largest single subsystem in the behavior, it exists entirely because of one public parameter's shape, and the shape was carried forward as a parity row (`ledger.md` L-1) rather than chosen. L-1 established that the shipped `items()` thunk "was never re-read" and concluded the array redesign was behavior-preserving. That is true and is not the question. The question nobody asked is whether the _collection_ has to be a consumer input at all.

---

## A4 — `landing({ run })` publishes five public types for one escape hatch

**What is public because of it.** `LandingStart`, `LandingContext`, `LandingHandle` from `sortable/landing.js`; and `DOMRealm` and `Point` from `drag.js`, which the README states are exported precisely because public types structurally depend on them.

**What the runner contract asks of a consumer.** From `landing.ts:1-14` and `spec.ts`: call `done()` or `fail()` **exactly once**; relinquish the visual's transform on `destroy()` so the kernel's pin is not overridden; treat `target` as **provisional** because the kernel measures again at the join; `retarget` is optional and is trajectory quality only. Four clauses, three of which are about a coordinate and lifecycle model the consumer otherwise never sees.

**Why the case for it has weakened.** `landing({ run })` was the _only_ route to settle-time timing until Phase 15. Ledger L-6 records the correction:

> _What closed it:_ **Phase 15 shipped the ergonomic form.** `LandingOptions.duration` accepts `number | (() => number)` … and the default runner is kept. This row called that "a public-option change for Phase 15 or 22" long after Phase 15 made it.

So the motivating capability now has a one-line expression, and `run` retains only the genuinely-different case: a spring, or any runner not expressible as a WAAPI keyframe pair. The contract's own preserved-result list names "custom spring landing runner without a kernel change" as a probe-1 requirement, so the capability is not speculative — but it is now the _sole_ justification for five public types and a four-clause obligation.

**And a consumer runner can void a library correctness guarantee.** Contract `02` §Landing states I-24 — the final position agreeing with the authored DOM — as conditional on three things, the third being the consumer's:

> **A thrown `destroy()` costs the final-position guarantee, not just tidiness.** … So I-24 is conditional on **three** things, not two: authoritative measurement, a successful pin, _and_ successful relinquishment of runner control. The kernel cannot independently detach a runner it did not create.

That is the sharpest form of the finding. `landing({ run })` is the only public affordance in the package that can invalidate a stated correctness invariant, and the invariant it invalidates is the one the whole settlement join exists to produce.

**Trade-off.** Keeping `run` costs the five types, the four-clause obligation, the conditional on I-24, and the `landing()` module's standing position as the one bracket-discharged rather than reading-headed module in the I-36 table (C5-03, and C6-01 currently disputes that bracket). Removing or narrowing it costs the spring case, which nothing in the repository exercises and which no consumer exists to want — the ledger is explicit that `@ydinjs/drag` has no external consumers at all (`plan.md:443`).

---

## A5 — What feature composition actually buys, measured

The package measures this itself, which makes it the one machinery magnet with a number rather than an argument. Using the **live** figures from Checkpoint D review 6 (C6-07 — the README's table is stale):

| Composition | Brotli | Delta over minimal |
| --- | --- | --- |
| minimal (`y()` + `callbacks()`) | 10,199 B | — |
| minimal (`xy()`) | 10,245 B | +46 B (an alternative, not an addition) |
| + `landing()` | 10,487 B | **+288 B** |
| + `layoutAnimation()` | 10,653 B | **+454 B** |
| complete | 11,025 B | +826 B |
| baseline A — feature-matched, non-composed | 10,765 B | composition costs **260 B** |

So:

- The **entire** tree-shakeable differential a consumer can realise is **826 B**.
- **742 B of it — 90% — is `landing()` and `layoutAnimation()`.**
- The remaining three optional features (`placeholder()`, `handle()`, `visual()`) are worth roughly **84 B between them**.
- Composition itself costs **260 B**, so a consumer installing everything pays 260 B for the privilege of being able to shake off 826 B.

**And two of the eight feature functions are not optional at all.** `assemble()` throws without an axis feature (`assemble.ts:116`) and throws without `callbacks({ onReorder })` (`assemble.ts:122`). `callbacks()` is an options object wearing a feature costume: every consumer writes it, it has no private state, it is not shakeable, and it carries two options (`threshold`, `readinessTimeout`) that configure the kernel rather than any callback.

**What the apparatus costs to keep.** Nine `exports` subpaths and their declaration files; the opaque `SortableFeature` brand and its two runtime helpers; `assemble()` with single-writer `claim`, required-slot validation and a total reverse unwind; nine TypeDoc entrypoints; `prune-declarations.ts` and the packaging test that guards it; a 654-line consumer fixture asserting each subpath's surface as an equality plus 29 negative import assertions; five size budgets with module-graph assertions in both directions; and the standing rule that every new seam is a coordinated edit across `SortableContribution`, `SortableSlots`, `assemble`, the behavior's call sites and the exports (`feature.ts:7-11`).

**The counter-argument, and it is real.** Size is not the only prize. Explicit composition makes installed behavior _visible_ where the shipped package inferred everything from an options object — the README makes this case and it is a legitimate one. `y()` versus `xy()` is a genuine capability difference that an options flag would express worse, because a default 2-D rule cannot be shaken (Phase 17's own decision, `ledger.md` §5). And the opaque brand closes third-party authoring for real, which the two earlier attempts at that boundary failed to do.

**But those arguments apply to two or three features, not eight.** The honest question this review puts is not "should composition exist" — it is **why `handle()`, `visual()`, `placeholder()` and `callbacks()` are features rather than fields**, when between them they carry no private state, no tree-shakeable code beyond 84 B, and one of them is mandatory. Each is a subpath, a declaration file, a TypeDoc entry, a packaging assertion and a set of import lines in every consumer, in exchange for a measured ~28 B each.

**The contract has already reserved this question and left it open.** `03` §What isolation cannot shake lists the irreducible overhead — "every optional key in `SortableContribution`; every assembler property read and `claim` branch; the nullable slot fields and their null checks; the three always-present pipeline arrays" — and closes:

> **That plumbing may well be entirely acceptable. It has not been weighed.**

This finding is that weighing, and the number it produces is 260 B of cost against 826 B of realisable benefit, 90% of which comes from two of the eight features.

**A side effect of opacity worth recording here.** Because `SortableFeature` is a brand with no identity, a collision diagnostic cannot say which two features collided — the consumer gets `sortable: insertion geometry contributed by two features` and must find them by reading the call. Contract `03` describes the check as one that "can name both features"; `plan.md` Phase 7 records the deviation and its reason: "features carry no name to print". The contract's wording and the artifact are reconcilable ("can" is a capability, not a claim), but the consumer-facing consequence stands: composition errors in a six-feature call site name the slot and nothing else.

---

# B — Overly strong or inaccurate guarantees

## B1 — "Validated at construction, at the call that introduced it" is false for two of four options

**The claim, in four places — including the normative contract.**

Contract `03` §Public option domains states the rule _and its discriminator_:

> **Where the check runs depends on when the value exists, and that is the whole of the distinction** (D4, Checkpoint D). A _fixed_ option — every row below except one — is a value the consumer already holds at construction, so it is validated **at construction**, exactly once, before any drag.

`README.md:99`:

> Each throws a `TypeError` on a value outside the domain, so a `NaN` threshold fails at the call that introduced it rather than as a drag that never activates.

`feature.ts:118-121` on `requireFinite`:

> Called at **construction** wherever the value exists by then, so the offending call is still on the stack.

`tests/sortable/options.node.test.ts:3-5`:

> Each is validated as early as its value exists, which for a fixed option is **construction**, with the offending call still on the stack.

**What actually happens.** There are two different "constructions" on this surface, and the README's table does not distinguish them:

| Option | Validated in | Reached from |
| --- | --- | --- |
| `landing({ duration })` (number) | `landing()` itself, `landing.ts:74` | the consumer's own call ✅ |
| `layoutAnimation({ duration })` | `layoutAnimation()` itself, `layout-animation.ts:42` | the consumer's own call ✅ |
| `callbacks({ threshold })` | `assemble()`, `assemble.ts:168` | **`draggable()`** ❌ |
| `callbacks({ readinessTimeout })` | `assemble()`, `assemble.ts:173` | **`draggable()`** ❌ |

`callbacks()` performs no validation — it is `brandFeature(() => ({ callbacks: options }))` (`callbacks.ts:29`). `assemble()` runs inside the install function (`behavior.ts:63-72`), which runs inside `draggable()` (`drag.ts:70`). So:

```ts
const behavior = sortable(items, y(), callbacks({ threshold: Number.NaN })); // does not throw
draggable(root, behavior); // throws here
```

By the time the `TypeError` is raised, `callbacks({ threshold: NaN })` has returned, `sortable(...)` has returned, and neither is on the stack. The same is true of the three composition errors (missing axis, missing callbacks, non-function `onReorder`) and of `copyUniqueItems`'s duplicate-item rejection, which runs in `createSortableRuntime` — also inside `draggable()`.

**Why no test caught it.** `options.node.test.ts` drives `assemble()` **directly** (`assembleWith` at line 34) with a hand-built `FeatureContext`. That is a reasonable unit boundary, but it means the suite asserts _that_ the throw happens and can say nothing about _where a consumer sees it_ — which is the property the README, the source comment and the test's own header all claim. The test cannot fail against the discrepancy it is documenting.

**The stated discriminator does not discriminate.** The contract says the distinction is "when the value exists". But `threshold`'s value exists at `callbacks({ threshold })` exactly as `duration`'s exists at `landing({ duration })` — both are fixed values the consumer holds. What actually separates them is _which function performs the check_, and that is an implementation fact about where the default lives, not a fact about the value. The rule as written predicts that `threshold` is checked at `callbacks()`. It is not.

**Class:** verified overclaim. Small in consequence, precise in nature, and worth recording because **four** documents — one of them normatively ranked — agree with each other and disagree with the artifact, and because the rule they agree on names a discriminator that does not produce the observed behavior. This is the exact pattern the checkpoint record keeps finding, arriving on the public surface rather than in the SPI.

**Trade-off if it is closed rather than reworded.** Validating `threshold` inside `callbacks()` costs the "sole owner of the default" property (`feature.ts:82-86`): `callbacks()` would have to know the default to range-check it, and `assemble()` would then either re-check or trust. That is precisely the "which one wins" question the current design avoided. Rewording is cheaper than moving the check, and the finding may well close as a documentation correction — but it should close deliberately, because the _stated_ property is a real one that a consumer would reasonably rely on.

## B2 — Four controller methods, four post-`destroy()` behaviors

| Method | After `destroy()` | Invalid input before `destroy()` |
| --- | --- | --- |
| `updateItems(items)` | total no-op, **including invalid input** | throws `TypeError` |
| `ready(request)` | **still reports** through the platform channel (DEV) | n/a |
| `cancel(reason?)` | inert (kernel latch) | n/a |
| `destroy()` | idempotent | n/a |

Each of the three deviations from "inert" is individually defended in the source, and the defences are sound in isolation:

- `updateItems`'s total no-op exists because "'no-op after `destroy()`' has to mean the whole method, invalid input included, or the promise is only true for calls that would have been silent anyway" (`controller.ts:54-56`).
- `ready()` keeps reporting because "telling an integrator that its layout effect outlived the controller is the whole reason that DEV report exists" (`controller.ts:64-67`).
- `cancel`/`destroy` carry no controller-level latch because the kernel's already makes them inert, and "a second latch in front of them would be duplicated state that can disagree" (`plan.md:785`).

**The finding is not any one of them; it is that a consumer must hold all four rules at once**, and that one of them makes _validation itself state-dependent_: `controller.updateItems([a, a])` throws before `destroy()` and is silent after. A consumer writing defensive code around a duplicate-item bug will see it disappear on unmount.

**Trade-off.** Uniformity here has a real price — making `ready()` silent after destroy removes the one signal that tells an integrator its layout effect outlived the controller, which is a diagnostic nobody else can produce. This is an asymmetry worth _documenting on the public surface_ more than worth removing; today it is documented in the source and in `ledger.md`, and not in the README.

## B3 — The README states I-36 guarantees without the tier and residue the contract attaches to them

**What the README says**, under _deliberate differences_, in the same register as every other shipped property on that list:

> **A resolver that destroys the controller stops the sequence at that call** (contract I-36) … from `handle()`, admission **declines** … from `visual()` during a rebuild, no later candidate is resolved, no geometry is read, and the cache stays in the retired state teardown left it in. **The same holds for a composition that installs no `visual()` at all**: the library also calls `getBoundingClientRect()` on your rows and on your placeholder …

**What the contract says about the same rule.** Three qualifications, none of which reaches the README:

- `01` §Teardown: "this half of the terminal guarantee is **tier C** while everything above it is tier B." A `destroy()` from consumer code "runs all seven steps to completion and then **returns into the middle of whatever was calling it**."
- The obligation "is provisioning in two forms … over a floor of consequences, plus a register of stronger site-specific promises; **it is not a quantifier over call sites**."
- `03` §`y()`: the candidate loop is a _register entry_ that "promises more than I-36's floor — no geometry read at all, not merely no consequence", and explicitly: "**Sites not in the register get the floor.**"

So the contract's structure is: a weak universal floor, plus a short list of sites that promise more. The README presents the register entries as if they were the universal rule, and states no floor, no register and no tier.

**Being precise about what is and is not currently breached.** The README's `handle()` and `visual()` sentences describe register entries, and review 6 does not report those sites. What review 6 reports (C6-01…C6-05) is five _floor-level_ sites — the landing runner's `retarget`, the placeholder's `style` accessor, `placeholder()`'s `classList` accessor, the `moved()` hot path, and activation's publications after listener installation. Two of those involve the consumer-owned placeholder that the README's last sentence does reference. I am not claiming the quoted sentences are false; I am claiming the README asserts a general property in a document with no vocabulary for the floor/register split, at a moment when the floor has five open breaches.

**Class:** overclaim by omission, and the kind that matters most, because it is on the consumer-facing document. An internal invariant that outruns its artifact is a tracked defect; a README sentence that does is a promise.

**Trade-off.** Importing the floor/register vocabulary into the README makes it accurate and makes it considerably harder to read — no consumer wants a tier system in a migration guide. The alternative is to state only what holds universally and drop the enumerations, which loses the genuine improvement over the shipped package that the list exists to record. This is a real tension and it does not have a free answer; what it should not have is the current state, where the strongest available reading is the one a consumer takes away.

## B4 — `DragErrorContext.domain` is non-null for one failure stage in fourteen

`onError` has exactly two call sites:

- `spec.ts:1300` — `reportFailure`, the pre-identity admission path: `domain: null`, unconditionally.
- `spec.ts:1195` — the settlement seam: `domain: current.domain`.

And `settlement.prepare`'s `SETTLED_FAILED` arm (`spec.ts:1155-1166`) sets `draft.domain = null` for **every** stage except `FAILURE_TERMINAL_CALLBACK`, where it deliberately leaves the already-committed result in place so a reported drop is not relabelled.

So `DragErrorContext.domain` is non-null in exactly one scenario: a throw from the consumer's own `onFinish` or `onCancel`. For the other thirteen stages a consumer reads `null`.

**Why this is more than a curiosity.** `domain`'s presence is the stated reason `DragErrorContext` ships from `sortable.js` rather than `drag.js` — `domain.ts:200-213`:

> `stage` is kernel vocabulary, but `domain` is a sortable result, and `draggable()` has its own entry precisely so a future free-drag consumer never reaches the sortable behavior.

An almost-always-null field therefore determined an entry-point placement, which in turn is part of the argument for the two-entry split (C7). The field is not wrong — a terminal-callback failure genuinely does have a result to report — but a public shape whose type is `T | null` and whose value is `null` 13/14ths of the time is a shape a consumer cannot use without knowing that ratio, and the ratio is documented nowhere.

**Trade-off.** Narrowing it (for example, carrying the result only on the stage that has one) makes the type honest and makes `DragErrorContext` behavior-agnostic, which reopens the `drag.js`-versus-`sortable.js` placement in the _cheap_ direction. Leaving it costs nothing at runtime and costs a consumer one null-check they will write anyway.

## B5 — `preventDefault()` at admission, and the click question the contract declines

**What happens.** `preventDefault()` is the kernel's, "called exactly when an admission member returns non-null" (`02` §Discrete admission, D-32/C-03). Admission returns non-null for any press that resolves to a draggable item — _before_ the threshold is tested, before any drag exists, and regardless of whether one ever will.

**What the contract says about the consequence**, in `02` §Pointer capture is not here:

> Capture is acquired at **activation**, never at admission, so a below-threshold press never captures … **It does not follow that a click always survives**: admission already calls `preventDefault()` on `pointerdown`, and what that suppresses is a platform question this contract does not decide. The guarantee is about capture, not about clicks.

**Why this is a public-API finding and not a platform question.** "Does clicking a row still work when the row is also draggable" is the first thing a consumer building a sortable list of clickable items will ask, and it is not answerable from the documented surface. The contract declines it explicitly, the README does not mention it, and no public option exists to influence it. The two things a consumer might reach for — deciding at admission whether this press could become a drag, or opting out of the default suppression — are both unavailable: `handle()` narrows _which element_ admits, not _whether_ to prevent, and the prevention is unconditional on any admitted press.

The shipped package has the same behavior, so this is not a parity break. It is an inherited gap that the rewrite had an opportunity to close and did not, and the contract's decision to scope the guarantee to capture rather than to clicks means the gap is now recorded as deliberate.

**Trade-off.** Deciding it costs a real design commitment: either a documented statement of what survives a below-threshold press on each engine (which is the platform question the contract is right to be wary of), or a public affordance for suppression that adds surface to the one path with no room for it. Leaving it costs every consumer the same discovery, made empirically.

---

# C — Asymmetries and reasoning costs

## C1 — The public vocabulary is inverted relative to what a consumer branches on

`drag.js` exports **14** `FAILURE_*` constants plus the `FailureStage` type. What a consumer does with them: the recovery for each stage is the library's decision, taken before `onError` is called, so the consumer cannot act on the stage — only log, group or suppress it.

Meanwhile the values a consumer most plausibly _does_ branch on are not exported at all. `ledger.md` L-11 states it precisely:

> every reason the _library itself_ produces is a namespaced string constant that is **not exported**: `'drag:escape'`, `'drag:pointercancel'`, `'drag:lostpointercapture'` … and `'sortable:item-removed'`, `'sortable:collection-invalidated'` … So a consumer that wants "say nothing when the user pressed Escape, warn when the item vanished" must hard-code an undocumented string it can also see change without notice.

L-11 is already found, already argued, and already deferred to Phase 23 by owner decision. This review adds only the other half: **the same question has never been asked of the 14 stages in the opposite direction.** If the test for a public constant is "a consumer has to be able to discriminate it" — the argument that made `AT_PROPOSAL`/`AT_CONSUMER` public — then 14 stages that drive no consumer decision and 5 reasons that drive an obvious one is the wrong split in both directions at once.

**Trade-off.** Fewer, coarser stages lose telemetry fidelity, and telemetry is a legitimate use. But the current split maximises surface on the axis with the weakest consumer decision and minimises it on the strongest.

## C2 — Options are placed by who owns the default, not by what they configure

`threshold` (activation distance, kernel behavior) and `readinessTimeout` (settlement gate bound, kernel behavior) are both members of `SortableCallbacks`, on `sortable/callbacks.js`. Neither configures a callback. The stated reason (`feature.ts:82-86`) is that `callbacks()` is the sole surface that can carry the defaults without raising a which-one-wins question.

That is a sound implementation constraint that became a public shape. A consumer looking for the activation threshold will look at `sortable()`, at `draggable()`, or for a `threshold()` feature — the one place they will not look is inside the callbacks object.

## C3 — Omission is sometimes fatal, sometimes silently degrading

| Omitted | Result |
| --- | --- |
| axis feature | `TypeError: an axis feature — y() or xy() — is required` |
| `callbacks({ onReorder })` | `TypeError: callbacks({ onReorder }) is required` |
| `landing()` | **no landing animation at all** — the visual snaps to its final place |
| `layoutAnimation()` | siblings jump rather than slide (no shipped counterpart, so no loss) |
| `placeholder()`, `handle()`, `visual()` | sensible defaults |

The `landing()` row is the one that matters for migration. The shipped package always animated the drop; `landingTiming()` was an option with a default, not an opt-in. A consumer porting to drag2 who does not install `landing()` gets a working, correct, silently worse drag. The README's migration table does not flag it — it lists `landing()` as the destination for `landingTiming()`, which is true, and does not say that omitting the feature removes the behavior.

**Trade-off.** This is inherent to pay-for-what-you-use composition and is not a defect; the composition model has no vocabulary for "you probably wanted this", and inventing one (warnings, recommended sets) would undercut the model. The finding is that the _migration documentation_ carries the whole burden of communicating it, and currently does not.

## C4 — `handle()` and `visual()` share a subpath and little else

Co-located because "a consumer that wants one usually wants to think about the other" (`handle.ts:1-12`). But:

|  | `handle()` | `visual()` |
| --- | --- | --- |
| return | `HTMLElement \| null` — null refuses the press | `HTMLElement` — no null contract |
| call frequency | once per admitted input event | once per candidate per rebuild |
| what it affects | admission only | geometry, lift, placeholder sizing, landing |
| wrong-answer failure mode | press does nothing (visible) | biased hysteresis boundary (silent, L-10) |

A shared subpath implies a shared kind. These are a gate and a projection, and the projection is the one on the hot path with the silent failure mode.

## C5 — `reject(reason, { presentation: true })` is expressible, reaches the gate, and is unexercised

`ReorderResolution.reject` takes `ResolutionOptions` (`domain.ts:124-131`), `RejectedReorderResolution` carries `presentation: boolean`, and `settlement.prepare`'s `SETTLED_FULFILLED` arm returns `{ presentation }` for accepted **and** rejected alike (`spec.ts:1128`), so a rejected resolution holds the readiness gate.

A grep of the test corpus finds **no test** combining `reject` with `presentation: true`. The public documentation describes the protocol only in terms of an accepted reorder — `ResolutionOptions`' own docstring speaks of "the legitimate imperative consumer — the one that applies the reorder synchronously".

The semantics are arguable either way: a consumer rejecting a reorder may well need to render (reverting an optimistic update, showing an error), and holding the settlement until that render lands is coherent, with `RECOVERY_HOME` sending the visual back. But nothing states it, and nothing exercises it, so it is a live public path with no specification and no evidence.

## C6 — `ReorderRequest` carries three encodings of one fact

```ts
type ReorderRequest = Readonly<{
  item: HTMLElement;
  version: number;
  from: number;
  to: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;
```

`from`/`to` are indices; `before`/`after` are identity neighbours; `version` identifies the snapshot the indices are relative to. A consumer applying the reorder needs one of these, and the story uses `after` (`request.after?.dataset['label']`) while the React fixture uses indices. Both are correct, which is the point: the library must keep all three mutually consistent across collection replacement, and must document which is authoritative when they disagree — and a consumer must decide which to trust.

The design reason is on the record (`domain.ts:26-33`): `before`/`after` are what reconciliation tests for survival and what lets the writer express a start gap. That justifies them _internally_. It does not establish that all three belong on the public request.

## C7 — Four imports, four subpaths, four nested calls

```ts
import { draggable } from '@ydinjs/drag2/drag.js';
import { ReorderResolution, sortable } from '@ydinjs/drag2/sortable.js';
import { y } from '@ydinjs/drag2/sortable/y.js';
import { callbacks } from '@ydinjs/drag2/sortable/callbacks.js';

draggable(root, sortable(items, y(), callbacks({ onReorder })));
```

against the shipped package's

```ts
import { ReorderResolution, sortable } from '@ydinjs/drag';

sortable(container, { items, onReorder });
```

The `drag.js` / `sortable.js` split exists so that "a future free-drag consumer never imports the sortable behavior" (`drag.ts:1-16`). That benefit is real and arrives at Phase 18–20. It is being paid for now, by every consumer, and the payment is an extra import line and an extra nesting level for a function whose name — `draggable` — no longer describes what it does, as the README itself notes.

A secondary observation: `draggable(root, …)` and `sortable(items, …)` take the two halves of one relationship at two different call sites, and the container is not the collection's parent by contract — nothing checks that `items` are inside `root`. A consumer that passes mismatched pairs gets a controller that admits nothing, with no diagnostic.

---

# What I checked and found sound

Recording these so the review is not read as uniformly negative, and so they are not re-litigated:

- **The result and resolution unions.** String discriminants, narrowed arms, no internal constant needed to discriminate. `result.type === 'accepted'` narrows with no import. This is straightforwardly better than the shipped `is*` predicates and the ledger's drop justification holds.
- **"Acceptance is never inferred."** Explicit, well-defended, and consistently implemented — a non-resolution value becomes `FAILURE_REORDER_RESOLUTION` rather than a silent accept (`domain.ts:148-158`).
- **The D-33 acknowledgement protocol as a consumer experience.** The survey confirms the claim: `createCommitTracker` is gone from both the story and the React fixture, replaced by one ref and a two-line layout effect. Keying on the request object rather than on a minted token is the right call and demonstrably reduced consumer code.
- **The surface is asserted as an equality, per subpath, against the packed tarball**, with 29 `@ts-expect-error` negative assertions that fail the build if they stop erroring. This is stronger than any API-stability practice I have seen in this repository and should be preserved through whatever else changes.
- **Construction-time option validation as a principle** (independently of B1's accuracy problem) — refusing `NaN` at declaration rather than as a drag that never activates is correct, and the shipped package's silent acceptance was worse.
- **The opaque feature brand.** The two earlier boundary attempts were genuinely incoherent, and branding closes the world at zero runtime cost. Whether there should be eight features is A5's question; that the ones that exist are closed is right.
- **`y()` versus `xy()` as separate features.** Phase 17's argument survives scrutiny: a default 2-D rule cannot be shaken, and the suite pins a real capability difference rather than a preference.
- **The insertion rule has no tunables, and that is a deliberate strength.** Contract `03` §`y()`: "The placeholder being a candidate _is_ the hysteresis … **No dead band, no direction latch, no tunable — which is why the rule cannot be mistuned into oscillation.**" A public surface that declines to expose a knob it would then have to defend is the right call, and it is the one place on this surface where an option was refused rather than added.
- **Every native admission is a queue boundary.** `updateItems()` called from a `handle()` or `visual()` resolver is safe by construction rather than by consumer discipline (`02` §Queue semantics), and a nested ingress event is refused rather than latched. This is a strong reentrancy guarantee that a consumer never has to think about, which is what a good one looks like.
- **Two independent gates, with the overlap stated as structural.** "`settlement.effect` returns `void` and the two gates hold independently, so the consumer's render still overlaps the landing animation instead of serializing ahead of it … a **structural property rather than a promise-handling convention**." The property is real and it is the reason the protocol could not simply await the consumer.

---

# Open questions for the owner

Ordered by how much later work each one gates.

1. **A1 — is synchronous reentrant `destroy()` a promise worth its price, and is Phase 18 the right place to decide?** Phase 18 carries a deliverable to redo the whole stretch enumeration for free drag. Deciding the guarantee's shape _before_ that enumeration is the difference between paying once and paying twice, and `plan.md:853` already names a third copy of the latch as the falsifier.
2. **A5 — should `handle()`, `visual()`, `placeholder()` and `callbacks()` be features?** They carry ~84 B of shakeable code between them and one of them is mandatory. This question is cheapest to answer before free drag adds its own feature set and doubles the surface it applies to.
3. **A3 — does the collection have to be a consumer input?** The largest subsystem in the behavior descends from one parameter's shape, which was carried forward as parity rather than chosen.
4. **B1 — correct the claim or move the check?** Rewording is cheap; moving the check reopens the sole-owner-of-the-default property.
5. **B3 — should the README state guarantees at the tier the contract rates them?** The contract already distinguishes I-6's kernel-sequenced tier B from I-36's participant tier C; the README states both as unqualified properties.
6. **B5 — does a click survive a press on a draggable row, and is that the library's answer to give?** The contract scopes its guarantee to capture and declines the click question; a consumer cannot decline it.
7. **C5 — what does `reject({ presentation: true })` mean?** It is reachable today and has no specification.
8. **C1 — is the exported vocabulary on the right axis?** L-11 is already queued for Phase 23; the 14-stage half of the same question has not been asked, and both should be answered together or the surface changes twice.

---

## A closing observation about method

Six Checkpoint D passes have found the same class of defect at successively deeper levels, and each fix was correct at the level it was written. The pattern is consistent with a mechanism that is converging. It is equally consistent with a **public guarantee that generates an unbounded internal obligation** — which is what `plan.md:816` says in its own words when it records that the clause "governed every overridable member of every consumer-owned node — a set the consumer chooses, which cannot be enumerated".

The contract's freeze rule requires a failing executable case before the _SPI_ may change. There is no equivalent rule for the _public API_, and there is no equivalent forcing function: a public contract that is expensive to honour produces defects rather than compile errors, and defects get fixed one at a time. Six passes of correct individual fixes is exactly what that looks like from the inside.

That is the strongest argument in this review for pricing A1, A3 and A5 as public-contract questions now, before Phase 18 makes each of them a second time.