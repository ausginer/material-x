# Probe 2 — response to review 1

> **Status: frozen provenance.** Amended only for factual errata — never for a contract change, which goes into the normative documents alone.
>
> These answers were accepted and have been folded into [`00`](00-index.md)–[`06`](06-vertical-sortable-trace.md). Where this file and those differ, **they win**. It is kept because it records the _reasoning_ for D-3, D-6, D-7, D-9, D-10, D-15 and D-16, which the contract documents state only as conclusions.
>
> Two things here are now out of date and are corrected in place below: the cross-controller polymorphism argument in Challenge 1, and the `LandingHandle.pin(target)` sketch in Challenge 8 — the pin is kernel-owned through the lift session, so the handle has no `pin()`.

Answers to [`../reviews/contract-probe-2-review-1.md`](../reviews/contract-probe-2-review-1.md). This file records what changes and why; the edits themselves landed in the consolidation pass after review 2.

## Summary

| # | Challenge | Position | Impact |
| --- | --- | --- | --- |
| 1 | D-10 over-restricts feature frame state | **Partly agree** | Decision — D-10 relaxed to a specified extension point; F-3 downgraded |
| 2 | The behavior should not author the kernel slice | **Agree** | Decision — new D-15; F-2 roughly halves |
| 3 | The "structural invariants" claim is too strong | **Agree** | **Verdict** — 8 structural → 5, precisely scoped; I-3 and I-15 downgraded |
| 4 | Rollback needs an explicit prepared value | **Agree** | Decision — D-3 revised |
| 5 | One-commit release is transactionally inconsistent | **Agree** | **Verdict** — D-6 withdrawn; the metric is retracted |
| 6 | Held gates need a precise transactional model | **Agree** | Decision — D-7 mechanism replaced; strengthens the slice metric to 13 → 7 |
| 7 | The `Behavior` generic is invalid | **Agree** | Wording + a restated (smaller) cast claim |
| 8 | A frozen snapshot does not freeze landing geometry | **Agree** | **New product finding** F-13/F-14; affects probe 1 equally |

Three of the eight change the verdict. Two claimed improvements are withdrawn, one is strengthened, and two product-level gaps orthogonal to the construction model are surfaced. **The central construction model holds.**

---

## Challenge 1 — feature-owned frame parts

**Partly agree.** Both consequences I used to justify D-10 are wrong. A third consequence, which I did not identify, is real but is a contract gap rather than a reason to forbid the mechanism.

### The two consequences do not follow

**"An aggregate intersection type would be required."** Wrong. Nothing needs to name the composed shape. The composition is an `Object.assign` fold; each participant holds a typed view of its own slice; a feature reaches its own fields through a locally declared type. No aggregate exists at any level.

**"Cross-controller shape variance threatens the hidden-class guarantee."** Wrong, on two counts. First, I stated the wrong invariant: what matters is that **the two frames of one controller share a deterministic, stable map**, which fixed-order part factories preserve exactly. Second, the cost of cross-controller variance is bounded polymorphism at the kernel's frame-access sites. A realistic application has a small number of distinct sortable configurations, so those sites see a correspondingly small number of maps and stay polymorphic rather than megamorphic; each miss is a map comparison on a path that already performs a fixed-shape multi-field `Object.assign`. If a build ever presents enough distinct combinations to matter, the remedy is local — fold a canonical superset of parts — and does not touch the contract. It is not a reason to forbid anything.

_(An earlier version of this paragraph argued that the cost was negligible because only one controller can be mid-gesture at a time. That is false — multiple pointer identities can drive multiple controllers concurrently — and the argument above does not depend on it.)_

### The real obstacle: no prepare-phase feature seam

A frame field is _committed transactional state_. Only `prepare` may write the draft. Every current feature pipeline (`beforeInsertionMove`, `afterInsertionMove`) runs in `action.effect` — **post-commit** — where writing the frame is forbidden.

So admitting feature frame parts also requires admitting a prepare-phase pipeline, which is a genuine contract addition, not a type change. That, and not the aggregate type, is why no first-iteration feature can have one today.

### Sketch

```ts
type FrameContribution = Readonly<{
  /** Returns this feature's fields as a fresh literal. Deterministic. */
  createPart(): object;
  /** Clears this feature's reference-bearing fields in place. */
  resetPart(frame: object): void;
}>;
```

The feature keeps typed access locally, with one cast contained in its own module:

```ts
// vertical.ts — nothing outside this file names these fields
type VerticalPart = { v_lastScanVersion: number };

const read = (frame: object): VerticalPart => frame as VerticalPart;
```

Prefer **prefixed string keys plus an assembly-time collision check** over symbols: `Object.assign` copies symbol keys correctly, but `Object.keys()` does not see them, which silently disables the `__DEV__` reset assertion in §[04](04-frame-slicing.md). The collision check is a one-liner and catches what the symbol was preventing.

```ts
if (__DEV__) {
  for (const key of Object.keys(part)) {
    assert(!(key in frame), `drag: frame key "${key}" contributed twice`);
  }
}
```

### Change

**Decision.** D-10 becomes: _the behavior owns the frame's kernel-facing and domain shape; a feature may contribute an opaque frame part through `FrameContribution`, but no first-iteration feature does, and the prepare-phase seam it would need is not specified._ The extension point is reserved and its mechanism is stated; it is not built.

**Finding.** F-3 drops from **real** to **resolved-by-mechanism**. The "no aggregate type" property (H-6) is no longer conditional on features abstaining — it holds because of how composition is expressed, not because of what features are forbidden.

### New invariants

- **Intra-controller shape identity** replaces cross-controller uniformity: every part factory must be deterministic, and the kernel must fold them in the same order for `current` and `draft`.
- **Frame key uniqueness** across kernel, behavior and every installed part, asserted at assembly in dev.

### New falsifier

A feature needs a frame part _and_ the prepare-phase pipeline it requires turns out to be unexpressible without giving features access to the draft on a path that also performs effects — which would reintroduce the discipline problem Challenge 3 identifies.

---

## Challenge 2 — the behavior should not author the kernel slice

**Agree, without reservation.** `createSortableFrame()` listing all seventeen fields directly contradicts the claim that no participant declares the whole shape, and it makes the kernel trust every behavior to initialise private fields it should not be able to name. I rejected the composition alternative on construction-time hidden-class-transition grounds, which is exactly the kind of unmeasured cost the review is right to refuse.

### Sketch

```ts
// kernel, private. Called twice, in identical order.
const composeFrame = (): KernelFrame & Part => {
  const frame = Object.assign(createKernelFrame(), spec.createFramePart());
  for (let i = 0; i < frameParts.length; i += 1) {
    Object.assign(frame, frameParts[i]!.createPart());
  }
  return frame;
};

const scrub = (frame: KernelFrame & Part): void => {
  resetKernelFields(frame);
  spec.resetFramePart(frame);
  for (let i = 0; i < frameParts.length; i += 1) {
    frameParts[i]!.resetPart(frame);
  }
};
```

```ts
// sortable/frames.ts — its own fields only
type SortableFramePart = {
  item: HTMLElement | null;
  visual: HTMLElement | null;
  snapshot: CollectionSnapshot | null;
  insertion: Insertion | null;
  proposal: ReorderProposal | null;
  outcome: number;
  recovery: number;
  domain: ReorderTransactionResult | null;
};

function createSortableFramePart(): SortableFramePart {
  /* one literal, 8 fields */
}
```

Two frames × (1 + parts) throwaway literals at controller construction. The transition chain is identical for both frames, so they converge on one map.

`Object.assign`'s declared return type is `T & U`, so `KernelFrame & Part` falls out of the expression with **no cast** — see Challenge 7.

### Change

**Decision.** New **D-15**: the frame is composed kernel-first from parts; the behavior authors only `createFramePart()` / `resetFramePart()`.

**Finding.** F-2 roughly halves. "The behavior may mis-initialise the kernel slice" disappears entirely. What remains is per-part factory determinism and reset exhaustiveness — the second of which is F-11 and is shared with probe 1.

### New invariant

The kernel's fields are written **first**, by kernel code, before any contributed part. A part that overwrites a kernel field is a dev assertion failure under Challenge 1's uniqueness check.

---

## Challenge 3 — the structural claim is too strong

**Agree.** This is the most important correction in the review, and the verdict in [`00-index.md`](00-index.md) overstates. The activation trace has `prepare` performing DOM insertion, pointer capture, disposer registration into kernel-owned lifetimes, a private-runtime assignment, and consumer factory invocation. None of that is protected by the split.

### The precise line

**Structurally enforced — frame publication safety:**

| Property | Mechanism |
| --- | --- |
| `prepare` cannot mutate committed frame state | It never receives `current` |
| `effect` cannot mutate any frame state | It receives `Readonly<F>` |
| The behavior cannot write kernel fields | `BehaviorDraft<F>` makes the kernel slice `Readonly` |
| Revalidate-then-commit cannot be skipped | The kernel drives it; there is no behavior-callable `commit()` |
| A post-commit failure cannot revert a committed transition | `effect` runs after the swap and has no way to express a revert |

**Not structurally enforced — still discipline:**

| Property | Why the API does not enforce it |
| --- | --- |
| Preparation has no externally visible mutation | `prepare` can call anything, including DOM writes |
| Ownership transfers only at commit | Physical acquisition happens inside `prepare`, before the swap |
| Every callback boundary inside `prepare` is revalidated | The kernel checks **once**, after `prepare` returns |

The last row is worth stating plainly: probe 2 does **not** improve on probe 1 here. Probe 1's prose claimed per-boundary revalidation; its own trace shows a single check after all acquisition. Probe 2 makes that single check unforgettable, which is a real but much smaller gain than "structural".

### Corrected count

Five structural, not eight: **I-2** (prepare cannot mutate `current`), **I-5** (only the kernel writes `phase`), **I-10** (displacement cannot become a gate — `SettlementGates` is unreachable from a displacement hook, which is genuine capability absence), **I-16** (post-commit failure does not revert), and **I-9** (no fake async, as the default path).

**I-3** becomes _partly structural_: the publication boundary check is structural; per-boundary revalidation inside `prepare` is prose, unchanged from probe 1. **I-15** becomes **prose**: only _frame_ publication is atomic; resource ownership transfer is not.

**I-11** (release ordering) is not a type-level property at all — it is kernel-ordered sequencing. That is still a real improvement over a normative list the behavior follows, but it should be described as _kernel-enforced_, not _structural_. See Challenge 5 for the correction to the ordering itself.

### The available improvement, and its cost

Prepare's externally visible footprint can be shrunk substantially, though not to zero. Combined with Challenge 4:

```text
activation.prepare   create the placeholder element DETACHED; size it from the
                     visual's offset box; acquire pointer capture
                     → { placeholder, releaseCapture }
activation.effect    item.after(placeholder)          ← now a post-commit effect
                     presentation.use(() => placeholder.remove())
                     motion.use(releaseCapture)
                     rt.placeholder = prepared.placeholder
                     rt.lift = lift; rects.markDirty(); slots.onStart(item)
activation.rollback  prepared.releaseCapture()        ← the detached element is
                                                        simply garbage
```

Moving the initial insertion into `effect` is also **more consistent**: every subsequent placeholder move is already defined as a post-commit effect and the sole writer of its DOM position. There is no reason the first one should differ.

What cannot move is `setPointerCapture`, because capture acquisition can fail and the design deliberately prefers **fail-before-commit** to a post-commit failure from a committed `ACTIVATING` state with no capture. That is a real trade, and it is the residue: after the correction, activation's `prepare` performs exactly **one** externally visible mutation.

### Change

**Verdict.** [`00-index.md`](00-index.md)'s "eight invariants move from prose to structural" becomes five, with the two-column table above replacing the undifferentiated claim. The load-bearing argument for H-3 survives — it is just smaller and specific to frame publication.

### New invariant

**A discarded activation always retires the operation.** This is what makes disposer registration during `prepare` safe: there is no path where a discarded activation leaves the operation running with orphaned registrations. It must be stated, because it is currently only implied by the trace.

---

## Challenge 4 — result-bearing transitions

**Agree.** The current shape forces staged state into the private runtime, and the trace does exactly that (`rt.placeholder = placeholder` inside `prepare`), which is publication outside the transaction — the inconsistency the review identifies.

### Sketch

```ts
type Transition<F, Prepared = true, Capability = void> = Readonly<{
  /** Returns the staged value, or `null` to discard. `Prepared` is non-nullable. */
  prepare(draft: BehaviorDraft<F>, capability: Capability): Prepared | null;
  effect(
    current: Readonly<F>,
    prepared: Prepared,
    capability: Capability,
  ): void;
  rollback?(prepared: Prepared): void;
}>;
```

Transitions with nothing to stage use `Prepared = true` and return the literal `true` — no allocation, no sentinel object, and `null` stays unambiguous as the discard signal. The `Prepared` type parameter must not itself admit `null`; that is a contract rule the type cannot express, and it is the one wart in this shape.

Per-seam instantiation for vertical sortable:

| Seam | `Prepared` | Allocation |
| --- | --- | --- |
| `activation` | `{ placeholder: HTMLElement; releaseCapture: Disposer }` | one 2-field object per drag |
| `release` | `true` | none |
| `settlement` | `true` | none |
| `action` | `true` | none |

**Cost: one small object per drag, on the coldest path there is.** Nothing on the move path changes.

### Change

**Decision.** D-3 gains the `Prepared` parameter. This is the correction that makes `rollback` honest: it receives precisely what `prepare` acquired, rather than reaching into a runtime the discarded transition should never have touched.

### New invariant

**`prepare` may not write the behavior's private runtime.** Everything it acquires travels through `Prepared`. This is now enforceable by review because there is a designated channel; before, there was nowhere else to put it.

---

## Challenge 5 — one-commit release is unsafe

**Agree. The claim is withdrawn.**

The review's reading is correct and I did not think it through. The sequence closes the motion lifetime irreversibly while `current.phase` still reads `ACTIVE`, and there are three exits from that window:

- **`release.prepare` throws** → rollback, classified failure. Committed state is `ACTIVE`, but pointer capture is released and the move/up listeners are gone. The controller holds a committed active operation that can never receive another input. Failure recovery would settle it, but the intermediate committed state is a lie.
- **`release.prepare` returns `false`** → strictly worse. No failure is raised, and the operation is stranded in a committed `ACTIVE` state with no ingress and no path forward except `cancel()` or `destroy()`.
- **Reentrant destroy** → benign only because destroy cleans everything.

### Corrected sequence

```text
> UP  begin(); draft.phase = RELEASING; draft.pointerX/Y = release point
      commit()                                     ← commit 1: state matches reality
      lifetimes.motion.dispose()                   ← now consistent
      begin(); release.prepare(draft) → insertion + proposal
      preparationValid(); commit()                 ← commit 2
      release.effect(current, prepared, gate)
```

One extra 17-field `Object.assign` per `pointerup`. Once per drag. Irrelevant, and the review is right that it was never worth buying.

### What survives

**I-11 survives.** The kernel still closes motion between commit 1 and `release.prepare`, so the behavior still cannot get the ordering wrong; that was always the substantive improvement, and it is independent of the commit count.

### Change

**Verdict and metric.** D-6 is withdrawn. "Release drops from two commits to one" is removed from the claimed improvements in [`00-index.md`](00-index.md) — not deferred as an optimisation target. D-6 is replaced by a narrower statement about kernel-enforced ordering only.

### New invariant

**No irreversible physical action may occur while the committed frame describes a state that action has invalidated.** Stated generally, because release is unlikely to be the only place this could be gotten wrong.

---

## Challenge 6 — the transactional model for held gates

**Agree.** The trace is incoherent as written: it commits `landingHeld = false; readyHeld = false` and then has `holdForLanding()` mutate a committed frame field post-commit. That violates the transaction model outright.

Of the three ways out, the review's suggestion is the right one, and it is better than I realised.

| Option | Verdict |
| --- | --- |
| Hidden nested `begin()`/`commit()` inside the hold methods | Rejected. Invisible transitions, and two holds means two transitions. |
| Compute holds in `settlement.prepare`, commit them, start them in `effect` | Workable, but forces `prepare` to decide things it can only know by asking a feature — and the resolution's `presentationReady` is validated in `prepare` anyway, so it half-works and reads badly. |
| **Gate state on the kernel-private settlement attempt, with a sealed scope** | **Adopted.** |

The gate flags were never transactional state in any meaningful sense: nothing outside `advanceSettlement` reads them, they are unobservable, and they are per-settlement rather than per-operation. Putting them on the attempt the kernel already owns and already retires is strictly more accurate.

### Sketch

```ts
// kernel-private
type SettlementAttempt = {
  holds: number;
  readiness: ReadinessWatch | null;
  landing: LandingHandle | null;
  sealed: boolean;
};
```

```text
> RESOLUTION_SETTLED
    begin()
    spec.settlement.prepare(draft, value, status)   → outcome, recovery, domain
    preparationValid(); draft.phase = SETTLING; commit()
    attempt = createSettlementAttempt()             holds = 0, sealed = false
    lifetimes.cancellation.dispose()
    spec.settlement.effect(current, prepared, scope)
        scope.holdForReadiness(p)   → holds += 1; arm the watch + 500 ms bound
        scope.holdForLanding(start) → holds += 1; create the runner
    attempt.sealed = true
    if (attempt.holds === 0) { finalize(); }        ← same drain, I-9

> READINESS_SETTLED   attempt current ✔  phase SETTLING ✔
    if (attempt.readiness !== null) { attempt.readiness = null; attempt.holds -= 1; }
    advanceSettlement()

> LANDING_SETTLED     attempt current ✔  phase SETTLING ✔
    attempt.landing?.pin()
    if (attempt.landing !== null) { attempt.landing = null; attempt.holds -= 1; }
    advanceSettlement()
```

Three consequences, all improvements:

1. **A gate release is no longer a frame transition at all.** Probe 1 and probe 2 both ran `begin(); flag = true; commit()` per gate. The only transition in settlement is now `phase = FINALIZING`.
2. **A count is safe here**, where I previously rejected it. Each gate has a distinct slot, so a release is "clear the slot, decrement only if it was non-null" — idempotent and duplicate-proof, while still naming which gate is outstanding for a diagnostic. Probe 1's P-6 (two hard-coded gates) becomes a non-issue: a third gate is a third slot.
3. **The kernel frame slice loses two fields: 9 → 7.**

### Change

**Decision.** D-7's mechanism is replaced. Its _semantics_ — gates default open, the behavior holds only what it needs, absence of landing creates no work — are unchanged, which was the point of the inversion.

**Metric.** The kernel frame slice claim strengthens from **13 → 9** to **13 → 7**.

**Finding.** F-6 (a forgotten hold silently finalizes early) gains a real mechanism rather than a mitigation: sealing makes a _late_ hold detectable. Dev throws; production ignores it and reports through `onError`, because a panic would be a disproportionate response to a settlement bookkeeping error.

### New invariants

- **Holds are legal only before the scope is sealed**, i.e. only during `settlement.effect`.
- **Gate state is attempt-scoped, never frame-scoped.** A late `done()` for a retired attempt finds no attempt and is inert at both validation points — staleness handling comes free rather than being a separate check.

---

## Challenge 7 — the `Behavior` generic is invalid

**Agree.** It is a straight error, not a simplification. As written, the behavior must produce a valid install for **any** `F` the caller selects; sortable picks one. The signature is unsatisfiable.

### Corrected sketch

Under Challenge 2's part composition the behavior never names the composed frame at all, so the parameter is its own part:

```ts
type BehaviorInstall<Controller, Part extends object> = Readonly<{
  spec: BehaviorSpec<Part>;
  controller: Controller;
}>;

type Behavior<Controller, Part extends object> = (
  host: KernelHost,
) => BehaviorInstall<Controller, Part>;

function draggable<Controller, Part extends object>(
  root: HTMLElement,
  behavior: Behavior<Controller, Part>,
): Controller;
```

Both parameters are inferred from the argument. The consumer still writes `draggable(list, sortable(items, vertical(), …))` and names neither.

### The cast claim, restated

The absolute claim ("the boundary cast disappears entirely") was too strong and is replaced by a precise one. The composition site types cleanly because `Object.assign` is declared `(target: T, source: U) => T & U`:

```ts
const frame = Object.assign(createKernelFrame(), spec.createFramePart());
//    ^? KernelFrame & Part                                    — no cast
```

The feature-part fold is a loop, so its contribution is invisible to this type — which is correct, since neither kernel nor behavior may name a feature's fields.

So the accurate statement is: **zero casts at the kernel↔behavior boundary; one locally contained cast per feature that opts into a frame part** (Challenge 1), of which there are currently none. That is still better than probe 1, whose cast sat at the behavior boundary in every seam, but it is a smaller claim.

### Change

Wording, plus a narrowed D-9. The corrected form does not reintroduce a kernel↔behavior cast, so the improvement survives at reduced scope.

---

## Challenge 8 — frozen snapshot ≠ frozen geometry

**Agree, and this is the most consequential item in the review** — it is a product-level defect, not a documentation error, and it is **orthogonal to the construction model**. Probe 1 makes the same claim, and the shipped package appears to have the same exposure.

### The scenario

```text
settlement entry     target = placeholder.getBoundingClientRect()
landing starts       200 ms WAAPI transition toward that viewport point
React commits        the accepted order renders; item heights and the container
                     shift; the placeholder's viewport rect moves
landing completes    pin() to the target measured before the commit
presentation removed the item snaps to its authored flow position
                     ── visible jump ──
```

A frozen `CollectionSnapshot` freezes the semantic transaction. It says nothing about layout. The two gates were deliberately made concurrent precisely so React can commit _during_ landing, so this is not an edge case — it is the intended common path.

### Responsibility boundary

Two layers, deliberately not the elaborate option:

**(a) Mandatory floor — re-measure at completion.** At `LANDING_SETTLED`, before `pin()`, re-measure the placeholder and pin to the fresh rect. This guarantees the property that actually matters: _at the instant presentation is released, the pinned transform and the authored DOM agree._ Any error is absorbed as a slightly wrong trajectory **during** the animation rather than as a jump **after** it. Cost: one `getBoundingClientRect` per drag.

**(b) Optional — a runner retarget capability.** Readiness settling is already a kernel-observed event, and in the common React case it settles _before_ landing completes. That is a free retarget point:

```ts
type LandingHandle = Readonly<{
  pin(): void;
  destroy(): void;
  /** Optional. Absent runners fall back to (a)'s end-pin. */
  retarget?(x: number, y: number): void;
}>;
```

A spring implements it naturally; a WAAPI transition can re-commit; a runner that cannot simply omits it. No per-frame measurement, and the kernel needs no new lifecycle.

Not chosen: per-frame retargeting (expensive, and imposes a capability on every runner), and serializing readiness ahead of landing (destroys the concurrency the two-gate design exists for).

### The larger question underneath

Re-measuring the placeholder assumes the placeholder is _still where we put it_ after a React commit. It may not be. The placeholder is a node we inject into a container React reconciles; React's reconciler moves its own children with `insertBefore` against nodes it knows about, and an unmanaged sibling can end up in the wrong position after insertions or removals — even though it is not removed.

If that happens, the placeholder is not a reliable footprint during a commit, and re-measuring it produces a _confidently wrong_ answer. That is a bigger question than landing, because the placeholder is the authoritative layout footprint for the whole operation, and the brief leaves the presentation technique open. Alternatives exist (leave the real item in flow as its own footprint and lift a clone; or have the consumer render the placeholder as part of its own tree) but choosing between them is a separate investigation.

### Change

**New findings.**

- **F-13 — the landing target can go stale under a concurrent authored commit.** Real, product-level, affects probe 1 and probably the shipped package. Resolved by (a), improved by (b).
- **F-14 — an injected placeholder inside a React-reconciled container may be repositioned by a commit.** Unresolved. Escalated to an open question because it undermines (a) if true.

**New decision.** **D-16**: the landing target is re-measured at completion and never reused from settlement entry; mid-flight correction is an optional runner capability.

### New invariant

**At presentation release, the pinned visual position and the authored DOM position agree.** This replaces the incorrect "the frozen snapshot prevents an obsolete target" claim in [`06`](06-vertical-sortable-trace.md), which should be deleted rather than weakened.

### New falsifier

If a controlled React fixture shows the injected placeholder being repositioned or detached by a commit during landing, then re-measuring it is not a valid floor, and the placeholder mechanism itself — not the landing mechanism — is what needs to change.

---

## Updated verdict

### Load-bearing, unchanged

- **H-1, H-2** — the private kernel executor and the private behavior runtime. Nothing in the review touched them, and Challenges 2 and 6 both _deepen_ them: the behavior stops authoring the kernel slice, and gate state moves from shared frame into kernel-private attempt storage.
- **H-4, H-5** — features as function factories returning contributions, assembled once into direct slots. Unchallenged.
- **H-6** — no aggregate frame type. Now stronger than claimed: Challenge 1 shows it holds because of how composition is expressed, not because features are forbidden from participating.
- **H-3** — kernel-owned transition boundaries. Still the load-bearing change, but the claim it supports is now **frame publication safety** specifically, not preparation safety in general.

### Decisions that change

| Decision | Change |
| --- | --- |
| **D-3** | Gains `Prepared`: `prepare → Prepared \| null`, `effect(current, prepared, cap)`, `rollback(prepared)` (C4) |
| **D-6** | **Withdrawn.** Release is two commits. Replaced by a narrower kernel-ordering statement (C5) |
| **D-7** | Semantics kept; mechanism replaced by a sealed, attempt-scoped settlement scope (C6) |
| **D-9** | Narrowed: zero casts at the kernel↔behavior boundary, one local cast per opting-in feature (C7) |
| **D-10** | Relaxed from prohibition to a specified, reserved extension point (C1) |
| **D-15** | New: frame composed kernel-first from parts; the behavior authors only its own part (C2) |
| **D-16** | New: landing target re-measured at completion; optional runner retarget (C8) |

### Findings that change

| Finding | Change |
| --- | --- |
| F-2 | Roughly halved — the behavior no longer authors the kernel slice (C2) |
| F-3 | Downgraded from **real** to **resolved-by-mechanism** (C1) |
| F-6 | Gains a mechanism (sealing) rather than a mitigation (C6) |
| I-3, I-15 | Downgraded — see the two-column table in C3 |
| **F-13** | New. Landing target staleness under a concurrent authored commit (C8) |
| **F-14** | New, unresolved. Injected placeholder position under React reconciliation (C8) |

### Metrics

| Claim | Status |
| --- | --- |
| Kernel frame slice 13 → 9 | **Strengthened to 13 → 7** (C6) |
| Release two commits → one | **Withdrawn** (C5) |
| Eight invariants prose → structural | **Corrected to five**, precisely scoped (C3) |
| No boundary cast | **Restated**: zero at the kernel↔behavior boundary; one local per opting-in feature (C7) |
| Move path: no allocation, two indirect calls | Unchanged; nothing in the review touched it |
| P-2 resolved at zero cost | Unchanged |
| Q-5 resolved by construction | Unchanged, and reinforced by C1 |

### Open before implementation

Carried forward: **Q-1** (should a throwing `admit` become a classified failure), **Q-2** (is `BehaviorDraft<F>` worth its `tsc` cost — now also interacting with the part-composition type in C2), **Q-4** (does the two-behavior-tag count survive), **Q-6** (`RECOVERY_HOME` for a rejected reorder), **Q-7** (the displacement element set).

New, and ordered by how much they could still move the design:

1. **Q-9 — is an injected placeholder safe inside a React-reconciled container?** (F-14.) This is the only open item that could invalidate a mechanism rather than a detail. It needs a fixture, not an argument, and it should be answered before implementation rather than during.
2. **Q-10 — does fail-before-commit justify keeping `setPointerCapture` in `prepare`?** (C3.) The alternative is a post-commit failure from a committed `ACTIVATING` state with no capture. Cheap to decide, but it is the last externally visible mutation in preparation.
3. **Q-11 — should the reserved frame-part extension point ship unimplemented?** (C1.) Specifying a mechanism nothing uses is exactly the speculative generality the brief warns against. The argument for keeping it is that D-10's prohibition was wrong and the record should say so; the argument against is that a reserved extension point tends to get built.

### Does the central construction model still hold?

**Yes.** Six of the eight challenges improve the model rather than threaten it, and the two that cost something — the withdrawn release metric and the corrected structural claim — are claims _about_ the model, not the model itself. The private-kernel/private-runtime/contributed-feature construction survives intact, and after Challenges 2 and 6 it is more consistent than it was: the behavior no longer touches kernel state anywhere, and the kernel's frame slice is down to seven fields it exclusively owns.

The one item that should change how the next step is planned is **F-14**. It is not a construction-model question at all, and no amount of further work on the kernel/behavior boundary will resolve it.