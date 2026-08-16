# Checkpoint E — independent cross-behavior audit

- **Reviewer:** Claude
- **Date:** 2026-08-17
- **Subject:** the sortable + free-drag system after Phase 20 and the D-85/D-86/D-87 remediation, against the current contracts and the executable evidence
- **Tree:** `62642259 drag: checkpoint e`, working tree clean apart from the two untracked review files

**Scope.** An independent second perspective, not a closure pass over Codex's list. I formed every finding below before opening `review-checkpoint-e-1-codex.md`, `-2-codex.md` and `-3-codex.md`; the overlap is recorded at the end. Phase 21 performance/size work and F-65 are out of scope and I found no correctness dependency on either. Nothing is fixed.

## Baseline

| Gate | Result |
| --- | --- |
| `npx just typecheck` | clean |
| `npx just test` | 48 files, **987 passed, 25 skipped** — the 25 are `describe.skipIf(!ENFORCE_BUDGETS)` in `tests/bench/size.node.test.ts`, i.e. the muted Phase 21 budgets, not silenced behaviour |

Every probe below was run against this tree and removed afterwards; `git status` is unchanged.

## Verdict

The cross-behavior architecture holds where it matters. The two behaviors are graph-disjoint in both directions, the frame model survives two part shapes, D-85 removed a genuine split-snapshot defect rather than an overhead item, D-86's per-tag legality is stated per tag rather than collapsed, and the failure vocabulary is behavior-neutral in every stage both behaviors reach. The remediation is real work and most of it lands.

What I did not find holding is **D-87's boundary**, which is claimed closed and is open for three of the sortable's six contribution slots through a supported public API — verified by compilation, not by reading. Beside it sit one implementation gap in `anchorTarget`, one unstated third-party calling convention, one design asymmetry between the two consumer-supplied points on the free-drag surface, and four evidence/prose defects of the class D-83 was written to stop.

| # | Finding | Class | Severity |
| --- | --- | --- | --- |
| CE1-01 | D-87's cross-behavior exclusion is incomplete: a hoisted sortable installer is assignable to `FreeDragInstaller` and its contribution is silently discarded | implementation | **moderate** |
| CE1-02 | `anchorTarget`'s accepted arm calls the motion constraint; its own comment says it makes no consumer call, and the site is in neither the I-36 table nor D-81's seam enumeration | implementation + contract | moderate |
| CE1-03 | `MotionConstraint` members are invoked both bound and detached; a third-party constraint that uses `this` works from one call site and breaks from two others | implementation | low–moderate |
| CE1-04 | `moveTo(point)`'s domain is unlisted in 07 §Validation and a non-finite point silently poisons committed frame state — the mirror of the point E-05 just decided must be validated | contract/design | moderate |
| CE1-05 | 07's `bounds` barrier row claims the feature "holds a liveness reading"; `bounds()` reads no latch at all | contract | low |
| CE1-06 | 05's free-drag group still carries the `Partial`-fragment garbage claim P18A-20 corrected in 07 | contract | low |
| CE1-07 | D-84's sortable half is unpinned — no sortable test asserts the admission attribution the decision states for both behaviors | evidence | low–moderate |
| CE1-08 | `FreeDragRuntime.item` / `.visual` are dead fields carrying a false comment | implementation | low |
| CE1-09 | 07's I-36 table attributes the `onEnd` barrier to `finalized`; neither behavior reads a latch there (the guarantee is kernel-side and does hold) | contract | low |
| CE1-10 | Evidence for F-64: `FeatureContext.root` has no reader anywhere and denotes a different element per tier; `report` is read by the assemblers, never by an installer | design observation | informational |
| CE1-11 | Failure-vocabulary asymmetry after two behaviors, as Checkpoint E item 5 asks for | design observation | informational |

## What I verified positively

Recorded because a finding list read alone overstates the damage.

- **B-1 / B-2 are non-vacuous and true.** `tests/packaging.node.test.ts` asserts both directions and pins each graph against its own tier, and an unconstrained free drag reaches neither `free-drag/bounds.ts` nor `shared/landing-runner.ts`.
- **D-85 is a correctness fix, and it landed completely.** `src/free-drag/geometry.ts` performs no DOM read of any kind; `rt.space` is handed down on `ActivationScope` and multiplied. The `@ydinjs/box-quad` exclusion is asserted on the source of both behavior directories.
- **D-80 (b)'s statement-order guarantee survives the second behavior for the right reason.** `createComposedFreeDragBehavior` needs no reordering because free drag has nothing to pull ahead of the installers, and `src/free-drag/behavior.ts:65-69` says exactly that rather than claiming a shared mechanism.
- **The `retireHooks.reverse()`-after-record discipline is reproduced identically** in `src/free-drag/assemble.ts:156-161`, including the comment explaining why the reverse is after the record and the unwind walks backwards.
- **D-66's no-start rule holds under destroy.** I drove two paths through the public entry — `destroy()` from inside `onDrop`, and `destroy()` from inside `onError` on a `FAILURE_RESOLUTION` — and both published zero terminals with zero reports. The kernel's `joinLive()` / `handleErrorReported` gating is what carries it (see CE1-09).
- **D-81's four bounds paths are each driven to the seam they name**, and the negative row (`FAILURE_ACTION_PREPARE` unreachable) is asserted as absence rather than argued.
- **E-08 landed.** `tests/docs.node.test.ts` §the free-drag tier runs per entry with `--treatWarningsAsErrors` and reads the emitted JSON's module list, so neither half can pass vacuously.
- **`FreeDragResolution`, the three-arm result set and the absence of a `noop` arm** are re-derived rather than inherited, and the reasoning in `src/free-drag/domain.ts:179-191` is correct: `accept()` on a zero-distance drop is an ordinary acceptance.

## Implementation defects

### CE1-01 — D-87 closes the boundary for the defining capability only; three sortable slots still leak, through a supported public API

**Severity: moderate.** This is the defect E-06 was raised about, still reachable, after the decision that claims to have closed it.

D-87 states the mechanism as sufficient: _"**One exclusion per direction is the minimum that works**, because assignability is decided on the declared alias rather than on a particular body"_ ([00-index.md](../../contract/00-index.md) §Checkpoint E's blockers, D-87). `src/free-drag/feature.ts:136` declares `insertion?: never` and `src/sortable/feature.ts:150` declares `constrain?: never`, and `tests/composition.declaration.test.ts` asserts both directions.

The exclusion is decided by the **two named slots only**. `SortableContribution` has four other members — `placeholder`, `beforeInsertionMove`, `afterInsertionMove`, `startLanding` — and `FreeDragContribution` declares no twin for any of them. What stops most of the leak in practice is not D-87 but TypeScript's _weak type_ detection: `FreeDragContribution` is all-optional, so a contribution with no member in common is refused with "no properties in common". Add the one member the two records genuinely share — `retire` — and the weak-type check is satisfied, and nothing else refuses the assignment.

**Verified by compilation, in the tree, through the public entry.** A hoisted installer, written the way D-78 says an ordinary author should write one:

```ts
const placeholderPlugin = (_c: FeatureContext) => ({
  placeholder: ph,
  retire: dispose,
});

freeDrag(
  item,
  { onDrop: () => FreeDragResolution.accept() },
  {
    plugins: [placeholderPlugin],
  },
);
```

`npx just typecheck` reports **no error**. The same holds for `{ beforeInsertionMove, afterInsertionMove, retire }`. The only form D-87 catches is the _annotated_ one — `const p: SortableInstaller = placeholderPlugin` then assigned across — which fails with `TS2322`, and that is the only form `tests/composition.declaration.test.ts` exercises: every row there starts from a `declare const` of an installer **alias**.

The consequence is D-87's own words, unchanged: `src/free-drag/assemble.ts:100-117` reads `constrain`, `retire` and `startLanding` and nothing else, so `placeholder` and both displacement hooks are **silently discarded** — _"A supported middle-tier API taking a value and doing nothing with it is worse than one that refuses it."_

Two further observations that belong with the finding rather than after it:

- The leak is **asymmetric**. Free drag → sortable is closed, because `constrain` has its twin and `startLanding`/`retire` are legitimately shared. Sortable → free drag is open for three slots. The decision's symmetry claim ("one per direction") is not the shape of the actual boundary.
- D-87's stated obligation — _"a new single-writer slot on either contribution needs its `never` twin on the other, or the boundary reopens for that slot"_ — is written as future work. It is already owed for three **existing** slots, which is what makes this a defect rather than a maintenance note.

### CE1-02 — `anchorTarget`'s accepted arm calls the motion constraint, and three documents say it does not

**Severity: moderate.** One false source claim, one omission from the I-36 enumeration, and one seam missing from an enumeration D-81 explicitly re-derived.

`src/free-drag/spec.ts:770-791`:

```ts
anchorTarget(current): Point {
  const origin = rt.originRect!;

  if (current.domain?.type === 'accepted' || slots.getHome === null) {
    // The accepted arm, and the unconfigured-home arm, answer from
    // arithmetic the frame already holds — no consumer call and no DOM
    // read. …
    if (current.domain?.type !== 'accepted') {
      return { x: origin.left, y: origin.top };
    }

    deriveMotion(…);
    return { x: origin.left + motion.x, y: origin.top + motion.y };
  }
  …
```

`deriveMotion` is `:121-137`, and its last statement is `slots.constrain?.apply(motion, view!)`. So the accepted arm's stated "no consumer call and no DOM read" is false whenever any constraint is installed: `apply` is a **declared middle-tier slot that admits arbitrary third-party code** — 07 §The decomposition calls it _"the first capability in this package a third party can supply in place of a first-party one"_ — and with `bounds()` it reaches `resolve()` (`src/free-drag/bounds.ts:65-89`), which is a consumer thunk or a `getBoundingClientRect()`.

Three separate consequences:

1. **No terminal barrier.** The seam reads `host.closed` at `:796`, immediately before `slots.getHome(...)`, and nowhere before `deriveMotion`. So a third-party `apply` is invoked after logical closure while the `home` resolver beside it is guarded — a split in one seam, and the same shape E-02 was raised about at `activation.effect`.
2. **The site is absent from the I-36 enumeration.** 07 §The terminal-barrier enumeration Category 1 is _"every declared consumer slot the behavior invokes"_. `constrain.apply`, `constrain.invalidate` and `constrain.retire` are declared slots the behavior invokes, and the table lists only the `bounds` **source** — a first-party feature's private input, not the slot. E-02's own remediation treats `constrain.apply` as foreign code owing a barrier ("`deriveMotion` then calls `constrain.apply`, which reaches a third-party constraint", `src/free-drag/spec.ts:328-338`), so the table and the code already disagree about whether that slot is on the surface.
3. **It is a fifth `apply` site, on the quality track, missing from D-81's list.** D-81 re-derived the bounds attribution precisely because the earlier list was incomplete, and its corrected enumeration is four seams: `activation.effect`, `moved`, a `TAG_POSITION` effect, `release.prepare`. `anchorTarget` is a fifth, and it is the only one the kernel runs through `runQualityValue` (`src/kernel/kernel.ts:1457-1460`), so a throw there is `FAILURE_LANDING_TARGET` → `presentation` with the landing **skipped and the drop standing** — an attribution _and a consequence_ no row of that table has.

**On reachability, stated honestly.** With the first-party `bounds()` the rect cannot be stale at this instant: `owned.motion.dispose()` runs in the kernel's settlement effect (`src/kernel/kernel.ts:1272-1283`), so the scroll/resize invalidator is dead, and `TAG_POLICY` is a no-op after `ACTIVE` under D-86. The resolve is therefore a cache hit and calls nothing. The defect is real for a **third-party** constraint, whose `apply` is unconditional, and the documentation defect is real either way. I record the narrowness rather than inflating the row — but D-81's own lesson was that a bounds attribution reasoned from where staleness is _raised_ rather than from where `apply` is _called_ is how the previous list went wrong, and this is the same derivation error one seam further on.

Related and smaller: the recomputation is redundant. `release.effect` already wrote `motion` to the lift at `:604`, and the accepted arm re-derives the same values from the same committed frame in order to re-enter a third-party slot.

### CE1-03 — `MotionConstraint` is called both bound and detached, and the convention is unstated

**Severity: low–moderate.** A third-party constraint that implements its members with `this` passes one call site and throws at two others.

`MotionConstraint` (`src/free-drag/feature.ts:88-94`) declares three **method** members. The behavior invokes them inconsistently:

| Member | Call site | Form |
| --- | --- | --- |
| `apply` | `src/free-drag/spec.ts:136` | bound — `slots.constrain?.apply(motion, view!)` |
| `invalidate` | `src/free-drag/spec.ts:461` | bound — `slots.constrain?.invalidate()` |
| `invalidate` | `src/free-drag/spec.ts:295-297` | **detached** — `guarded(constrain.invalidate)` |
| `retire` | `src/free-drag/assemble.ts:108` → `spec.ts:868-870` | **detached** — pushed as a bare function, called as `guarded(hook)` |

So a constraint whose `invalidate()` reads `this` works when the consumer calls `controller.invalidate()` and throws on the first scroll event, and its `retire()` throws at every operation retirement. The sortable is at least _consistently_ detached — `resolveInsertion: insertion!.resolve`, `invalidateInsertion: insertion!.invalidate`, `measureInsertion: insertion!.measure ?? null`, `retireHooks.push(contribution.insertion.retire)` — and 03 §Assembly justifies the flattening as "one property read and one call". Free drag has no such justification for the split and no document states the constraint on authors.

`bounds()` happens to close over its state, so nothing in the tree fails. That is precisely what makes it worth recording: the first third-party constraint the middle tier was opened for (D-70, B-6) is the one that meets it.

### CE1-08 — `FreeDragRuntime.item` and `.visual` are dead, and their comment is false

**Severity: low.**

`src/free-drag/runtime.ts:59-61` declares:

```ts
/** The two elements one operation is about, for `home` and the request. */
item: HTMLElement | null;
visual: HTMLElement | null;
```

Neither is ever read: `rt.item` and `rt.visual` appear nowhere in `src/free-drag/spec.ts`, and LSP `findReferences` returns exactly two sites for each — the declaration and the `null` seed in `createFreeDragRuntime` (`:78-79`). `retire()` (`:859-864`) clears `lift`, `originRect`, `space` and `view` but not these two. The comment names the two consumers that in fact use other sources — `subjectOf` builds from `root` and `draft.visual` (`spec.ts:140-143`), and `buildRequest` takes the subject.

Two costs, both small and both real: the file is the one place the contract points a reader at to learn what per-operation runtime state exists (`src/free-drag/runtime.ts:1-20`, "what lives here rather than in the frame part"), so the two fields misdescribe the model; and if either ever _were_ written they would not be cleared at retirement, which is the I-20 hazard the rest of the file is organized around.

## Contract and design findings

### CE1-04 — `moveTo(point)` has no stated domain, and a non-finite point silently poisons committed frame state

**Severity: moderate (design).** The free-drag surface takes exactly two consumer-supplied points. E-05 just decided that one of them must be read, checked for finiteness and copied inside the seam that consumes it. The other is unchecked, unmentioned, and lands in a **frame field** rather than in a single read.

07 §Validation is exhaustive over the config schema and says nothing about `moveTo`. `src/free-drag/spec.ts:467-492` reads the argument and writes it straight into committed state:

```ts
const point = argument as Point;

draft.offsetX = point.x - origin.left - (draft.pointerX - draft.originX);
draft.offsetY = point.y - origin.top - (draft.pointerY - draft.originY);
```

**Probed through the public entry**, activate → `controller.moveTo({ x: NaN, y: 10 })` → `move(50, 40)`:

| Observable | Result |
| --- | --- |
| rendered transform | frozen at the pre-`moveTo` value `translate(20px, 0px)` — the browser drops the invalid declaration |
| `onMove` geometry | `viewportDelta.x = NaN`, `currentRect.x = NaN` |
| `onError` | none |
| `globalThis.reportError` | none |
| terminal | one, `accepted` |

The poison is permanent for the operation, because `offsetX` is committed frame state that every later `deriveMotion` reads. The drag is visually frozen on one axis while every geometry object handed to the consumer carries `NaN`, with nothing reported on any channel.

Three reasons this is a contract finding rather than "the consumer broke its own drag", which is the disposition 07 §Validation's silent table applies to a `NaN` `threshold`:

1. The silent table's rows are justified individually — a `NaN` threshold _"makes the travel test permanently false, so the drag never activates and **no operation starts**"_. That reasoning is exactly what does **not** transfer: a live operation is running, `onStart` has fired, a terminal is owed and will be published.
2. The value reaches `anchorTarget`'s accepted arm as `origin.left + motion.x` and is returned unchecked, so the kernel composes `target = { x: anchor.x - origin.x, … }` (`src/kernel/kernel.ts:1489-1496`) and pins with it. E-05's stated reason for validating `home` was that _"a non-finite pair reached target composition or a renderer"_. The same pair reaches the same composition through the accepted arm, which has no check.
3. The two points differ in **who supplies them and when**, but not in what they can do. A recorded decision either way would settle it; what exists is silence in the one document that enumerates every other option's domain.

I make no recommendation about which way it should go — the point is that the two mirror cases were decided oppositely without the second being noticed.

### CE1-05 — the `bounds` barrier row claims a liveness reading the feature does not have

**Severity: low.**

07 §The terminal-barrier enumeration, Category 1:

> | `bounds` source | inside the constraint feature, on its own re-resolve | Latch read before; **the feature holds a liveness reading, not a mirror of one** |

`src/free-drag/bounds.ts` contains no reference to `host`, `closed`, or any liveness value; `FeatureContext` (`src/shared/composition.ts:24-36`) carries `realm`, `root` and `report` and offers no way to obtain one. The feature holds neither a reading nor a mirror. Whatever protection exists comes from the caller, and per CE1-02 one of the five callers has none.

This is the same claim-versus-code class as E-02 and E-03, in the row that names the capability D-70 opened the middle tier for.

### CE1-06 — 05 still carries the `Partial`-fragment claim that P18A-20 corrected in 07

**Severity: low**, but it is the precise defect D-83 was written to prevent.

[05-lifecycle-invariants.md](../../contract/05-lifecycle-invariants.md) §Free drag — new (D-69…D-76):

> **`freeDrag()` throws nothing for any config the compiler accepts** — garbage in every slot, **supplied through a `Partial` fragment**, still returns a controller

07 B-4 (a) struck exactly that sentence: _"**Corrected (P18A-20): a fragment does not admit garbage** — `Partial<T>` makes a property optional, it does not widen its type… The technique that works is the sortable's… spread a `Record<string, unknown>` **into the first argument**."_ The implementation followed 07: `tests/free-drag/free-drag.browser.test.ts:505-531` spreads into the first argument and says so.

So 05 now describes a technique that cannot express the claim it is attached to. D-83's durable half is the prohibition on restating a rule in a per-behavior document because _"a copy with no antecedent to carry is how the condition was lost"_; this is the same mechanism with the correction, rather than the condition, being the thing that failed to propagate.

### CE1-07 — D-84's sortable half is unpinned

**Severity: low–moderate (evidence).**

D-84 is stated for both behaviors: _"**A throwing `visual` resolver is `FAILURE_ADMISSION` (1) → `consumer`, in both behaviors**… the sortable calls it inside `seedDraft`, admission's second half."_ F-76 adds _"the same re-reading is owed for the sortable's copy of the table"_ and records the pin as _"Pinned as observed in `tests/free-drag/validation.browser.test.ts` … so the correction cannot be lost."_

It can be lost for the sortable. `grep -rn FAILURE_ADMISSION tests/sortable/` returns **nothing**: no sortable test asserts the stage or the coarse code for a throwing `visual`. The sortable's `visual` rows all assert the _destroy_ barrier (`sortable.browser.test.ts:770`, `:3249`, `:3270`), which is a different property.

The code is correct — `seedDraft` is reached only from `admitFrom` and from `command.admit` (`src/sortable/spec.ts:374`, `:607`), both admission — so this is a missing instrument, not a wrong attribution. But D-84's whole reusable lesson is that _"an attribution is a fact about a call site"_, and the behavior whose call site nothing asserts is the one that can move without failing anything. F-74's rule applies unchanged: a claim whose only test lives in the other behavior is indistinguishable, for this behavior, from an unasserted claim.

### CE1-09 — the `onEnd` barrier is attributed to `finalized`, which reads no latch

**Severity: low.** The guarantee holds; the attribution does not.

07 §The terminal-barrier enumeration: _"| `onEnd` | `finalized` | Latch read before. Single call, and the last one |"_. Both behaviors implement `finalized` identically and with no reading:

```ts
finalized(current) {
  const { domain } = current;
  if (domain !== null) {
    slots.onEnd?.(domain);
  }
},
```

(`src/free-drag/spec.ts:836-842`, `src/sortable/spec.ts:1682-1688`.)

The property is carried kernel-side, by `joinLive()` before `spec.finalized` in `joinSettlement` (`src/kernel/kernel.ts:1612`, `:1684-1686`) and by the phase/operation test in `handleErrorReported` (`:2228-2241`). I probed both routes — `destroy()` from inside `onDrop`, and `destroy()` from inside `onError` on a failure settlement — and both published **zero** terminals.

I raise it only because E-03 established the precedent that when a barrier moves kernel-side the table has to say so, and this row still reads as a behavior-side obligation that neither behavior discharges. A future author reading the table and deleting the kernel check would find nothing failing on the behavior side to warn them.

### CE1-10 — the evidence for a shared composition vocabulary is thinner than the shared declaration suggests

**Informational**, and directly against Checkpoint E's carried item 3 (_"Should the composition vocabulary be declared rather than duplicated? F-64, with its falsifier stated"_).

`FeatureContext` has three members. Reference counts are LSP `findReferences` on each declaration, corroborated by grep:

| Member | Who actually reads it |
| --- | --- |
| `realm` | one installer in the whole package — `bounds()` (`src/free-drag/bounds.ts:35`) |
| `report` | **no installer**; the two **assemblers'** unwind paths (`src/free-drag/assemble.ts:172`, `src/sortable/assemble.ts:233`) |
| `root` | **nothing at all** — one reference, its own declaration |

`report` is not dead, but it is not middle-tier vocabulary in practice either: it is supplied by each behavior (`behavior.ts:83` / `:130`) and consumed by that behavior's own assembler, and no shipped installer touches it. It is on the type for third parties, and `src/shared/composition.ts:27-34` argues its shape at length.

`root` is the interesting one, on two counts. It has zero readers anywhere in the tree, and it is the one member whose **meaning differs by tier**: `host.root` is the collection root for the sortable and the dragged item for free drag (`freeDrag(item, …)` passes the item as the ingress boundary — `src/free-drag.ts:86-89`, `src/free-drag/behavior.ts:83`). Nothing in `src/shared/composition.ts` says so, and B-7 asserts only that the declaration is shared.

That is worth putting in front of the decision F-64 defers. The type is presented as evidence that the two tiers already share a vocabulary; on inspection one member is exercised by one installer, one is a behavior-internal channel, and the third has no reader and denotes different elements depending on which entry an author imported it from. A shared declaration whose one behavior-dependent member is undocumented and unexercised is closer to the structural coincidence F-64 warns against than to a vocabulary.

### CE1-11 — the failure vocabulary after two behaviors

**Informational**, against Checkpoint E's carried item 5 (_"Is the failure vocabulary behavior-agnostic after D-74?"_). Measured over the tree rather than reasoned about:

| Stage | Sortable | Free drag |
| --- | --- | --- |
| `FAILURE_ACTION_EFFECT` (5) | — | ✓ |
| `FAILURE_INVALIDATION` (6) | ✓ | — |
| `FAILURE_SCHEDULED_FRAME` (7) | ✓ | — |
| `FAILURE_LANDING_CREATE` (10), `_INTERRUPTED` (11) | kernel-raised | kernel-raised |
| the other eight | ✓ | ✓ |

So after D-74 the vocabulary is behavior-neutral in _name_ everywhere, and three of thirteen stages have a single behavior producer — two of them the sortable's, one free drag's. That is a materially different answer from "ten of thirteen were already", which is what 07 §Carried to Checkpoint E records, and it is the number the question actually asked for. I draw no conclusion: two behaviors is a small sample and a stage with one producer is not thereby a sortable-shaped stage. It is recorded so the item can be closed against evidence.

## Method note, and one non-finding I retract

Every claim of the form _"X is pinned by instrument Y"_ was tested by removing X and running Y. Two things this produced are worth recording because they cut against my own first reading:

- I initially wrote up the **`finalized` barrier** as an E-02-class defect. Driving both destroy routes showed the guarantee holds kernel-side, which is why CE1-09 is a documentation finding and not a lifecycle one. Reading the barrier table alone would have produced a false major.
- I initially believed **D-87 leaked for any sortable-only slot**. The first probe (`{ placeholder }` alone) was _refused_ — by TypeScript's weak-type detection, not by D-87 — and I nearly filed the finding as closed on that evidence. Adding the single shared member `retire` is what separates the two mechanisms and is what makes CE1-01 real. A negative probe that passes for the wrong reason is exactly the non-discriminating control F-74 names, arriving from the reviewer's side.

## Overlap with the Codex reviews

Read after the above was written. Codex's E-01…E-05, E-07 and E-08 are closed in this tree and I independently confirmed E-01, E-04, E-05 and E-08 as landed; I did not re-derive E-02 or E-03 beyond the two destroy probes, which agreed with them.

**CE1-01 is a continuation of Codex's E-06, not a duplicate**: E-06 is recorded as closed by D-87 in `review-checkpoint-e-2-codex.md` and `-3-codex.md`, and the finding here is that the closure is partial and that the declaration suite cannot see the open part, because every row of it starts from an annotated alias. CE1-02 through CE1-11 have no counterpart in the three Codex documents.

## What would close these

Not dispositions — I am not proposing implementations, only naming what a closure pass would have to show.

- **CE1-01** — a compiling counter-example for each of `placeholder`, `beforeInsertionMove` and `afterInsertionMove` paired with `retire`, driven through `freeDrag(item, config, { plugins: [...] })` with an **unannotated** installer, plus whatever mechanism makes them fail. The current declaration suite cannot detect the regression, so a fix that leaves it unchanged is unpinned.
- **CE1-02** — either the accepted arm stops re-entering the constraint, or the comment, the I-36 Category-1 table and D-81's seam list all name it; and the barrier question is decided rather than left split within one seam.
- **CE1-03** — one sentence in `src/free-drag/feature.ts` stating the calling convention, or consistent binding at the three sites.
- **CE1-04** — a recorded decision, either row of 07 §Validation's two tables, that says what `moveTo`'s point domain is and why it differs from `home`'s.
- **CE1-05, CE1-06, CE1-09** — prose corrections at the rows named.
- **CE1-07** — one sortable row asserting `codeOf(FAILURE_ADMISSION)` for a throwing `visual`, in the form `tests/free-drag/validation.browser.test.ts:121` already uses.
- **CE1-10, CE1-11** — nothing; they are inputs to F-64 and to carried item 5, not defects.

---

LSP plugin - available; used: findReferences on FreeDragRuntime.item / FreeDragRuntime.visual and on all three FeatureContext members, which is the evidence behind CE1-08 and CE1-10 — `root` returns one reference, its own declaration, and `report` returns the two assembler unwind sites and no installer.

CE1-01's assignability result was established with in-tree `tsc` compile probes rather than with LSP, because the question is whether an assignment type-checks rather than where a symbol is referenced; the re-exported-alias under-reporting caveat recorded in the D-77 landing review still applies to the middle-tier types.