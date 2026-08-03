# `drag2` — probe 2: private kernel, private behavior runtime, contributed features

## Status

**Consolidated for an executable implementation probe.** This is the frozen
construction model for `drag2`, revised after
[review 1](../reviews/contract-probe-2-review-1.md) (answered in
[`challenge-response.md`](challenge-response.md)), the React placeholder probe,
[review 2](../reviews/contract-probe-2-review-2.md),
[review 3](../reviews/contract-probe-2-review-3.md) and
[review 4](../reviews/contract-probe-2-review-4.md),
[review 5](../reviews/contract-probe-2-review-5.md) and
[review 6](../reviews/contract-probe-2-review-6.md) — three pre-implementation
consistency, correctness and cost passes.

**The signatures are compiled.**
[`packages/drag/docs/contract-probe-2/contract.ts`](../../../../packages/drag/docs/contract-probe-2/contract.ts)
holds the representative contracts, a reference sortable behavior implementing
every seam, a driver for every seam (admission, activation, `moved`, action,
release, settlement, arm, join), and `@ts-expect-error` assertions for **each
tier-A claim that is expressible as a type error** — several, such as sealing
and hold linearity, are sequencing rules no type can state. It is covered by
`npx just typecheck` from `packages/drag`.

**It is a *type* fixture, not an executable lifecycle reference.** It has no
queue, no cancellation state machine, no failure checkpoint, no readiness watch
and no landing completion dispatch; where a driver needs one it has an inert
stub. At 2,300 lines it can look executable, so this is worth stating plainly:
**typecheck cannot catch a lifecycle error there.** The executable cases live in
the test matrix in [05](05-lifecycle-invariants.md) and belong to the
implementation. **These documents are the source of truth; where the fixture
disagrees, the fixture is the bug.**

[`../contract/`](../contract/) — probe 1 — remains the reference for **lifecycle
invariants, edge cases and validated product requirements**. Its *construction*
model (a public `Kernel` object, one shared runtime the behavior extends in
place, a behavior that calls `begin()`/`commit()` itself, `Pick<>` projections
over an aggregate runtime type) is not carried forward.

`challenge-response.md` is **frozen provenance**. Its arguments are folded in
here; where it and these documents differ, **these documents win**. It is
amended only for factual errata, never to carry a contract change — otherwise it
drifts into being a second live version of the contract. Documents 00–06 are the
only contract set.

### Normative precedence and freeze

The set is read with this precedence:

1. **00–04 are normative contracts**: decisions, ownership, lifecycle SPI,
   feature composition and frame rules.
2. In **05**, the invariant table, open questions, measurements owed and test
   matrix are normative. The chronological finding narratives are rationale; an
   older finding paragraph cannot override a later decision or the contracts in
   00–04.
3. **06 is an illustrative execution trace.** It must agree with 02, but never
   overrides 02 when wording drifts.
4. `contract.ts` is a type fixture only. Review files and
   `challenge-response.md` are provenance only.

The architecture decisions are frozen for the implementation probe. A further
contract change requires a failing executable lifecycle case that the frozen SPI
cannot express; a prose-only review finding is not sufficient. Performance and
bundle choices explicitly listed as measurements remain open until measured.

## The model

| # | Claim |
| --- | --- |
| H-1 | The kernel is an **internal executor**. It owns machine state, queue, frame pair, attempts, lifetimes, cancellation and teardown privately. It is not a public authoring object. |
| H-2 | A behavior is instantiated once per controller and owns a **completely private runtime** captured by its callbacks. The kernel does not know, store, extend or type it. |
| H-3 | The behavior supplies a **frame part** and a fixed set of **direct lifecycle callbacks**. The kernel selects transitions, opens and commits frames, and calls those callbacks. The behavior never calls `begin()` or `commit()`. |
| H-4 | A **feature is a function factory** that may create its own private runtime and returns a construction-time **contribution object** of named callbacks plus metadata. |
| H-5 | The behavior assembles contributions **once** into direct slots and fixed pipelines. No descriptor is interpreted on a runtime path. |
| H-6 | There is **one physical frame**, composed kernel-first from independently owned parts. **No participant declares a concrete whole-frame type.** (The kernel's own private generic *is* `KernelFrame & Part`; the claim is about who authors a concrete shape, not about the absence of any intersection.) |

## Verdict

The model holds. Its load-bearing property is H-3: once the kernel owns
`begin()`/`commit()`, the *prepare → commit → post-commit effect* discipline
stops being prose the behavior must obey and becomes the shape of the callback
contract.

That guarantee must be stated precisely, in three tiers. Conflating them
overstates what the API delivers.

| Tier | What it means | Examples |
| --- | --- | --- |
| **A — Frame publication safety** | The violation does not compile, or is unexpressible | `prepare` never receives `current`; `effect` receives `Readonly` (top-level slots); the behavior cannot write kernel frame fields; there is no behavior-callable `commit()`; a post-commit failure has no way to express a revert; release and settlement cannot discard |
| **B — Kernel-enforced sequencing** | The kernel orders it; the behavior has no opportunity to get it wrong | motion closes after the `RELEASING` commit and before the final measurement; revalidate-then-commit runs unconditionally; a settlement scope is sealed before any gate is armed; `dispose()` is projected off the lifetimes handed to the behavior; a seam throw is classified **and stops the seam's success continuation** |
| **C — Discipline** | A contract rule a participant must obey; the API permits violation | `prepare` performs no externally visible mutation; part factories are deterministic; `resetFramePart` is exhaustive; the shallow-copy contract and the immutability of frame *referents*; the ordering rule inside an `effect` |

Tier C is not a defect of this model — probe 1 had the same rules with none of A
or B. But the honest claim is *"frame publication became structural"*, not
*"preparation became safe"*. See [05](05-lifecycle-invariants.md) for the
per-invariant classification.

Concrete consequences of the model, none of which is offered as a headline
metric:

- The kernel's frame slice is **seven fields it exclusively owns**. Settlement
  gates left the frame entirely for a kernel-private attempt.
- The behavior authors only its own frame part; it cannot mis-initialise kernel
  state because it cannot name it.
- Probe 1's open question **Q-5** (where the geometry cache lives) is answered by
  construction: inside `vertical()`.
- Probe 1's pressure point **P-2** (a free drag must clamp before writing) is
  resolved at **no** hot-path cost — the move path spends the same three
  post-`MOVE` indirect calls probe 1 spent. That boundary is deliberate and
  narrow; the end-to-end count is M-1's job.
- Probe 1's **P-1** (no live policy seam) is resolved: policy updates are
  behavior actions and the kernel supplies the transition envelope.

What this model does **not** improve: per-boundary revalidation inside a
`prepare` (unchanged from probe 1 — one check, at the end), and the number of
callbacks a behavior author implements (comparable to probe 1, not fewer).

**No hot-path or bundle number here is measured yet.** The four owed
measurements are M-1…M-4 in
[05](05-lifecycle-invariants.md) §Measurements owed; until they land, the
performance and tree-shaking statements in these documents are design intent,
not evidence.

## Artifacts

| # | Artifact | What it fixes |
| --- | --- | --- |
| 1 | [`01-construction-ownership.md`](01-construction-ownership.md) | `draggable()`, the two-phase handshake, who owns what, the privacy boundary, teardown |
| 2 | [`02-kernel-behavior-contract.md`](02-kernel-behavior-contract.md) | `BehaviorSpec`, the tri-phase transition, capabilities, gates, the action envelope, the settlement/landing protocol |
| 3 | [`03-feature-composition.md`](03-feature-composition.md) | Contributions, assembly, private feature runtimes, consumer-declared views, tree-shaking |
| 4 | [`04-frame-slicing.md`](04-frame-slicing.md) | Part composition, shape authority, copy/reset ownership, write protection |
| 5 | [`05-lifecycle-invariants.md`](05-lifecycle-invariants.md) | Invariants by tier, findings, open questions, test matrix |
| 6 | [`06-vertical-sortable-trace.md`](06-vertical-sortable-trace.md) | One complete downward reorder under controlled React, with hot-path accounting |
| — | [`contract.ts`](../../../../packages/drag/docs/contract-probe-2/contract.ts) | The compiled fixture: representative contracts, a reference behavior, the seam drivers, and `@ts-expect-error` assertions for every tier-A claim |
| — | [`challenge-response.md`](challenge-response.md) | Provenance: the review-1 answers these documents fold in |

Read 1 → 2 → 4 for the execution model; 3 for composition; 6 to see it run.
Read `contract.ts` when a signature in the prose looks ambiguous — it is the
version that has to compile.

## Preserved from probe 1

Inputs, not re-derivations.

| Finding | Discharged in |
| --- | --- |
| FIFO run-to-completion dispatch and defined reentrancy | [02](02-kernel-behavior-contract.md) §Queue |
| Explicit transition and commit boundaries | [02](02-kernel-behavior-contract.md) §Tri-phase — tier A/B, D-3 |
| Stale async continuation rejection (double validation) | [02](02-kernel-behavior-contract.md) §Attempts |
| Synchronous and terminal `destroy()` | [01](01-construction-ownership.md) §Teardown |
| Independent readiness and landing gates | [02](02-kernel-behavior-contract.md) §Settlement — requested, sealed, then armed, D-7 |
| No fake asynchronous work when landing is absent | Gates default open; absence of a `landing()` feature holds **no landing gate**. Readiness is unaffected, and same-drain finalization requires neither gate held (I-9). |
| Layout displacement is not a lifecycle gate | [03](03-feature-composition.md) — a displacement hook cannot reach `SettlementScope` |
| Release stabilizes motion before producing exactly one proposal | [02](02-kernel-behavior-contract.md) §Release — tier B, D-6 |
| Identity-based collection reconciliation | [03](03-feature-composition.md) §Collection |
| Nearest-centre insertion with the placeholder as incumbent | [03](03-feature-composition.md) §`vertical()` |
| Numeric spatial attempt identity where sufficient | [02](02-kernel-behavior-contract.md) §Attempts — behavior-private, D-11 |
| Correct cleanup during long-running landing | [05](05-lifecycle-invariants.md) I-7 |
| Optional feature code remains tree-shakeable | [03](03-feature-composition.md) §Tree-shaking |
| Custom spring landing runner without a kernel change | [02](02-kernel-behavior-contract.md) §Landing — the kernel never names a runner type |

## Decision ledger

`D-n` cross-references probe 1's `C-n` where the two models disagree.

| ID | Decision | Why | vs probe 1 |
| --- | --- | --- | --- |
| D-1 | `draggable(root, behavior)` uses a **two-phase handshake**: `behavior(host)` returns `{ spec, controller }`; the kernel then arms ingress. No `install()` side effect. | Makes "no input before install returns" unexpressible rather than a rule. | replaces C-1 |
| D-2 | The kernel is **not a value the behavior holds**. It hands out a small `KernelHost` at construction and per-seam arguments at call time. No exported `Kernel` or `KernelRuntime` type. | H-1. Six of probe 1's twelve `Kernel` members existed only because the behavior drove transitions. | replaces C-3 |
| D-3 | Every transactional seam is a **`Transition`**: `prepare(draft, capability) → Prepared \| null`, `effect(current, prepared, capability)`, optional `rollback(prepared)`. The kernel commits between prepare and effect and revalidates first. One shared **core returning a `SeamOutcome`**, and a **per-seam driver** that reads it: action discards normally, activation discard retires *but activation failure does not*, release and settlement cannot discard at all. | H-3. `Prepared` is the designated channel for staged state, so a discarded transition never has to have touched the private runtime. A `boolean` core conflated *discarded* with *failed*, which let every seam continue success work after a classified failure (D-23). | new |
| D-4 | The behavior's runtime is **captured by closures**, not stored by the kernel. | H-2 verbatim. Alternative recorded as F-4. | replaces C-3 |
| D-5 | `admit(event, draft)` returns **the element to lift**, or `null`. | The kernel gets the one thing it needs from admission and nothing else. `item` is behavior state. | narrows C-4 |
| D-6 | Release is **two commits**: the kernel commits `RELEASING` and the release point, *then* closes motion ingress, *then* opens the transition in which the behavior resolves the final insertion and builds the proposal. | One extra frame copy per `pointerup`. Committing first means no irreversible physical action ever occurs while the committed frame describes a state that action has invalidated. | keeps C-4's ordering; the kernel now owns it |
| D-7 | Settlement gates default **open**, are **requested** during `settlement.effect`, and live on a **kernel-private settlement attempt** that is sealed when that callback returns and only then **armed**. Each may be requested at most once. | Encodes "no fake asynchronous work when landing is absent" as the default path, while keeping readiness independent of landing. Request-seal-arm is what makes a synchronous `done()` from a `duration: 0` runner safe. Gate state was never observable or transactional; putting it on the attempt makes staleness handling free. | replaces C-9's mechanism, keeps its semantics |
| D-8 | The **behavior** writes the lift transform, inside `moved(current, lift)`. | Resolves P-2 at no cost: the same three post-`MOVE` indirect calls either way. | replaces C-4 note |
| D-9 | `Behavior<Controller, Part>`; both parameters inferred. The kernel is internal, so a type parameter costs no public signature noise. **Disjointness from the kernel slice is enforced twice**: `FramePartOf<Part>` at the authoring boundary, `validateFramePart` in production at `arm()`. | Deletes probe 1's cast-at-the-boundary compromise. `Object.assign`'s `T & U` typing composes the frame with no cast. `Part extends object` alone does not forbid a mutable `phase`, so the type parameter cannot carry the guarantee by itself. | replaces C-3's compromise |
| D-10 | **The behavior owns the frame's domain shape.** A feature *may* contribute an opaque frame part, but the prepare-phase seam it would need is **not specified and not implemented**. | The mechanism is recorded because prohibiting it was wrong; building it for no consumer would be the speculative generality the brief forbids. | new |
| D-11 | Attempt identity: object identity for resolution/readiness/settlement (kernel-private), a monotonic `number` for the coalesced spatial attempt (behavior-private). | Ported. Each owner holds its own. | keeps C-8 |
| D-12 | A feature is `(context) => Contribution`. Contributions are read once at assembly and **dropped**. | H-4/H-5. Declarative, validatable by key. | replaces C-5 |
| D-13 | Features declare **their own structural view types**. No feature imports `Pick<SortableRuntime, …>`. | Inverts the dependency: the consumer states its requirement. | replaces C-3's projections |
| D-14 | The eight-phase vocabulary and the five resource lifetimes are kept verbatim. | Nothing in this model touched them. | keeps C-15 |
| D-15 | The physical frame is composed **kernel-first from parts**: the kernel writes its own literal, then folds the behavior's part. Two sources, no fold over feature parts (D-10). The behavior authors `createFramePart()` / `resetFramePart()` only. | The behavior can no longer mis-initialise kernel fields, because it cannot name them. Construction-time hidden-class transitions are paid twice per controller and are not a measured cost. | new |
| D-16 | The landing target is **provisional while readiness is pending**, **authoritative once the authored presentation is final**, and **authoritative again at the join**, where the kernel performs the final pin before releasing presentation. Whether to re-anchor follows the **recovery**; `authoredReady` only says whether the authored DOM is final *now*. | Evidenced by the React probe. Correctness comes from the final pin, not from every runner being retargetable. Absent readiness means *ready synchronously*, not *nothing changed* — the two were conflated in an earlier draft. | new |
| D-17 | **Pointer capture is kernel-owned**, acquired on `root` at activation and released with the motion lifetime. | The kernel already owns pointer identity, ingress, the motion lifetime, release ordering and teardown. This makes `activation.prepare` externally inert for the reference behavior. | new |
| D-18 | The resolution choice is a **staged `ResolutionCommand`**, not a `ResolutionGate` with `open()`/`skip()`. | Makes "exactly one choice, exactly once" structural. A capability with two methods and no state machine left zero calls, duplicate calls and `open` -then- `skip` all undefined. | new |
| D-19 | **Geometry is a paired contribution** — `resolve` / `invalidate` / `retire` — flattened into direct slots at assembly. | The behavior owns the events that make geometry stale; the feature owns the cache. Contributing only `resolve` forced behavior code to reach into a private rect index, which could not compile. | new |
| D-20 | Feature seams take **frame state and runtime state as separate arguments**. The runtime argument is one `PresentationView` per operation. | A single view carrying a `current` frame property was not constructible without leaking the kernel's swappable references. Separating them also removes a duplicated `pointerY`. | narrows D-13 |
| D-21 | `LifetimeScope = Readonly<Pick<Lifetime, 'signal' \| 'use' \| 'useWhile'>>` is what activation hands the behavior. | A type-level projection costs nothing — the same physical object is passed — and it converts I-11 from "the behavior should not close motion" into "it cannot". | new |
| D-22 | The v1 authoring surface is **unsupported-but-possible**, not prevented. Seam, spec and host types are unexported; `SortableFeature` is exported because authoring has to typecheck at all. | Named because the brief asks for the boundary. TypeScript accepts a structurally matching literal regardless of whether a type name is exported, so "only built-ins may author" was never enforceable — and it is not a correctness boundary, since nothing in the kernel depends on provenance. | new |
| D-23 | The seam core returns a **`SeamOutcome`** (discarded / invalidated / prepare-failed / committed / effect-failed), and **a classified failure stops incompatible continuation** — no retirement, no consumer invocation, no gate arming, no terminal callback. | Catching a throw is only half a failure model. The checkpoint is queued, so the window between the throw and the checkpoint is exactly where the old boolean let success work run. | new |
| D-24 | `SettlementInput` is **discriminated and exhaustive over all five cases** — fulfilled / rejected / skipped / canceled / failed — with a stated mapping to outcome, recovery, domain result and callback. | Five *open numeric* statuses with no mapping was the defect; the number of cases was not. Removing canceled/failed made the kernel unable to produce behavior-owned terminal state at all (D-28). | new |
| D-25 | The collection action **never discards**: it stages `cancelReason` and `effect` publishes first, then cancels. | An invalid collection ends the current drag; it must not throw away the consumer's update, which is what `host.cancel()` + `null` did. | new |
| D-26 | **Post-callback revalidation** at every reentrancy-capable boundary, with stale-return disposal for anything the callback *returns*. | Reserve-before-call protects resources that already exist. A `LandingStart` that destroys the controller and then returns a live handle leaked it; an `admit` resolver that destroys let the listener mint an operation on a terminal controller. | new |
| D-27 | One canonical `movePlaceholder()`, anchored on `insertion.after` with an append fallback, **inert when the placeholder is already in position**, and **refusing an anchor outside the placeholder's own container**; `homeInsertion` carries real identity neighbours. | `before?.after(…)` is a silent no-op for a start gap. `Node.before()`/`append()` on an already-correct position is a remove-and-reinsert that resets CSS transitions and forces layout, and release invokes the helper unconditionally. `before()`/`after()` are relative to the *anchor*, so an item the consumer reparented mid-drag does not fail the write — it moves the placeholder into the other container, taking the drag's layout footprint out of the list. Every caller reaches the writer with an insertion built from a snapshot that may be older than the DOM (spatial move, release write, home recovery), so the refusal belongs in the writer and classifies at each caller's own stage — `PLACEHOLDER_MOVE`, `RELEASE`, `LANDING_TARGET`. Destination recovery does not use the writer and already tests sibling identity before re-anchoring. | new |
| D-28 | **Every classification entrypoint latches.** A kernel-private `seamFailureRequested` flag makes `host.fail` indistinguishable from a throw at the driver boundary; `armSettlement` returns `ARM_ARMED`/`ARM_STALE`/`ARM_FAILED`; landing completion is once-only. | D-23 covered throws only. The checkpoint is *queued*, so the window before it applies is precisely what has to be closed — and it was still open for explicit `host.fail`, for landing-create failure, and for a synchronous runner `fail()`. | extends D-23 |
| D-29 | **Teardown is total.** Each frame reset is individually wrapped and ingress abort runs from a `finally`. | `resetFramePart` is behavior code the API permits to throw; an unwrapped throw made `destroy()` non-terminal against I-6. | new |
| D-30 | The **feature value is opaque** — an unexported `unique symbol` brand. `FailureStage` and `DOMRealm` become public because public types structurally depend on them. | "Public stable type whose full structure is internal and unstable" is not a coherent third state. Branding closes the world for real; exporting the genuinely-needed types stops the leak the other way. | replaces D-22 |
| D-31 | The public proposal and results are **narrowed unions with string discriminants**, carrying version, identity neighbours, rejection reason and cancellation stage. | Probe 1's preserved product contract. Discrimination must not require an internal outcome constant. | new |

## Findings

Severity is about the model, not implementation effort. Resolved entries are
kept with their original numbers so the review record stays readable.

| ID | Finding | Status |
| --- | --- | --- |
| F-1 | The prepare/effect split raises the callback count | **Downgraded to a note.** Twelve top-level `BehaviorSpec` members, ~16 functions, against probe 1's fifteen. A wash, not a cost. |
| F-2 | Part factories must be deterministic and folded in a fixed order for both frames; TypeScript proves neither | **Open, tier C.** `__DEV__` shape assertion. Much narrower than before D-15, which removed the kernel-slice half. |
| F-3 | "No aggregate type" is conditional on features abstaining | **Resolved, and restated.** No *participant* declares a concrete whole-frame type; the kernel's private generic is `KernelFrame & Part`. It holds because of how composition is expressed (D-15), not because features are forbidden. |
| F-4 | ~16 closures per controller from D-4 | **Measured and accepted (M-2, 2026-08-02 — [measurements/m2.md](../measurements/m2.md)).** The closure model costs **3.6× the heap per controller — 506 B against 141 B, stable from 100 to 1000 controllers**. It also **calls at least 2.9× faster** (0.0013 µs against 0.0038 µs), because a captured closure is a direct call while the static-spec form is a property load plus an indirect call. So the trade is not "pay heap for simplicity" as this entry assumed — it is pay heap for speed on the one path that runs every frame. Kept. |
| F-5 | `admit` runs inside native dispatch and can throw into the event loop | **Open.** Inherited from probe 1's Q-1. The wrap is three lines; whether to change the observable behavior is Q-1. |
| F-6 | A forgotten gate hold silently finalizes early | **Partly resolved.** Sealing detects a *late* hold; it cannot detect a *missing* one, so the structural claim was too strong. What remains is a test obligation: any fixture installing `landing()` or supplying `presentationReady` fails loudly if the corresponding hold is never taken. |
| F-7 | Landing-target arithmetic duplicates across behaviors | **Accepted, minor.** Export it as a pure helper, never a seam. |
| F-8 | D-8 adds an indirect call to the move path | **Withdrawn — it never did.** Probe 1 and this model spend the same three post-`MOVE` calls (`spec.moved`, `lift.composeXY`, `frame.schedule`); only which party makes the middle one changed. Kept as a number only so the review record reads continuously. |
| F-9 | The kernel cannot type the consumer resolution; it threads an `unknown` | **Neutral.** Validation was always the behavior's. |
| F-10 | Contribution objects are structurally polymorphic at the assembler | **Non-issue.** Construction-time, once per feature. Recorded so it is not rediscovered. |
| F-11 | `resetFramePart` exhaustiveness is unprovable | **Open, tier C, inherited.** `__DEV__` heuristic catches retained objects, not stale scalars. Identical in probe 1. |
| F-12 | Teardown crosses two owners: `spec.retire()` may throw, and runs while the behavior's DOM is still attached | **Resolved by contract.** The seven-step order in [01](01-construction-ownership.md) is normative; the kernel wraps `retire()`. |
| F-13 | The landing target goes stale when the authored commit inserts, removes or resizes content above the placeholder | **Confirmed by the probe, resolved by D-16.** |
| F-14 | React repositions or detaches the injected placeholder | **Disproved.** The probe establishes that React does neither. |
| F-15 | A new keyed item inserted into the destination gap leaves the placeholder in the wrong **semantic** gap | **Confirmed by the probe, resolved by D-16**'s re-anchor. |
| F-16 | When a short landing completes before readiness, the authoritative correction at the join is visually abrupt | **Accepted, quality only.** Correctness is unaffected. A retargetable runner improves it; the kernel guarantee does not depend on one. |
| F-17 | `anchorTarget()` and `retarget()` on the readiness path are fallible, with no defined failure response | **Resolved by contract.** Neither is load-bearing, so both are best-effort reports rather than classified failures: the runner keeps going, no hold moves, and the join's authoritative pin is what decides correctness (I-29). |
| F-18 | A post-commit `effect` has no rollback, so it can leave a resource visible but unowned | **Resolved by contract.** Register each release before making the resource visible; publish private references only once every resource is owned; consumer callbacks last (I-30). |
| F-19 | The generic transition driver was not total: an `effect` throw escaped to panic, `rollback` failure had no policy, and activation's discard and post-effect checkpoint were missing | **Resolved by contract.** One shared core, per-seam wrappers with their own discard and failure policies. |
| F-20 | Legal `null` returns from `release.prepare` and `settlement.prepare` could strand an operation; `ResolutionGate` had no linearity | **Resolved by types.** Release stages a non-nullable `ResolutionCommand` (D-18); settlement returns `PreparedSettlement \| SeamRejection`. |
| F-21 | A synchronous landing completion raced the hold that was installed after `start` returned | **Resolved by contract.** Request → seal → arm (D-7). |
| F-22 | The join and feature retirement were not robust across code the kernel does not own | **Resolved by contract.** Presentation release in a `finally`; runner destruction best-effort; per-hook wrapping in reverse installation order. |
| F-23 | `host.fail` targets the current operation, so a late continuation could fail the wrong one | **Resolved by contract.** Driver classification, the kernel's `inSeam` latch, `FeatureContext.report` instead of `fail`, and a closed `FailureStage` union. |
| F-24 | The hot-path accounting contradicted itself: "zero allocations, two indirect calls" versus a transform string and three calls | **Withdrawn, restated, then measured (M-1, 2026-08-02 — [measurements/m1.md](../measurements/m1.md)).** Three indirect calls, one string, plus a `{ x, y }` in the in-place lift mode. The generic frame copy this entry queried is **0.098 µs of a 2.64 µs sample (3.7%)** and is kept — with the bound M-1 found: its cost jumps 10× between 12 and 16 behavior-part fields, and this frame sits 4 below that cliff. |
| F-25 | The reentrant-cancel counterfactual reversed FIFO | **Corrected.** `cancel()` from inside `onReorder` enqueues first and wins; the completion is stale. Now a test, not a counterfactual. |
| F-26 | The tree-shaking criterion named an impossible minimal build | **Corrected.** A minimal *vertical* sortable contains vertical geometry; what must be absent is *unselected* geometry, free drag, landing and layout animation. The subpath/export table is now written down. |
| F-27 | Classification did not stop incompatible continuation: activation retired past its own failure, release invoked `onReorder` after a failed effect, settlement armed a half-requested plan, the join emitted `onFinish` for a failed drop | **Resolved by D-23.** F-19 was not actually resolved before this. |
| F-28 | An invalidating collection replacement was discarded along with the consumer's update | **Resolved by D-25.** |
| F-29 | The five settlement statuses had no total mapping, and the reference turned a skipped/no-op resolution into a rejected, home-recovering drop | **Resolved by D-24.** |
| F-30 | A resource *returned* from a reentrancy-capable callback could leak — a `LandingStart` handle, or a whole operation minted after `admit` destroyed the controller | **Resolved by D-26.** |
| F-31 | The reference placeholder writer could not express a start gap, and `homeInsertion` carried no real neighbours | **Resolved by D-27.** |
| F-32 | The `ACTIVATING` collection deferral contradicted FIFO — `onStart` runs before `START_COMMITTED`, so an `updateItems()` from it is appended first | **Resolved by deletion.** I-30 already publishes the runtime before `onStart`, so `ACTIVATING` reconciles exactly like `ACTIVE`. The invalidating case is resolved by `host.cancel` latching synchronously, so `START_COMMITTED` cannot activate a cancelled operation. |
| F-33 | Kernel-owned cancel/failure could not construct behavior-owned terminal state — `outcome`/`recovery`/`domain` live in the behavior's part and no seam could write them | **Resolved by D-24.** All five settlement cases return to the behavior. |
| F-34 | `host.fail()` bypassed `SeamOutcome`, so an explicit classification still allowed every forbidden continuation | **Resolved by D-28's latch.** |
| F-35 | A landing-create failure rolled back its hold and let the *original* accepted settlement finalize before the queued checkpoint | **Resolved by `ArmOutcome`** (D-28). |
| F-36 | A throwing `resetFramePart` could skip the second scrub and the ingress abort, making `destroy()` non-terminal | **Resolved by D-29.** |
| F-37 | `finalized` used a binary accepted-vs-everything predicate, sending the no-op result to `onCancel` | **Resolved by an exhaustive switch** on the domain discriminant. |
| F-38 | Revalidation existed after `LandingStart` but not after the `anchorTarget` before it, so `start` could run after a synchronous `destroy()` | **Resolved.** Revalidate on both sides. |
| F-39 | The final pointerup render existed only in the trace, not in the normative seam | **Resolved.** It is part of `release.effect`. |
| F-40 | `moved()` had no wrapper, so a render or schedule throw became a panic | **Resolved.** Kernel-wrapped; scheduling narrowed from inside via the latch. |
| F-41 | The public proposal and result types regressed probe 1's preserved contract | **Resolved by D-31.** |
| F-42 | "Public stable feature type, internal unstable shape" was not a coherent boundary | **Resolved by D-30's brand.** |

## What would falsify this model

- a feature needs a frame part *and* the prepare-phase pipeline it requires
  cannot be expressed without giving features a path that both mutates the draft
  and performs effects;
- a behavior needs to request a kernel *lifecycle* transition rather than an
  action — the expected case is keyboard sorting, which is recorded as revising
  the kernel contract rather than being worked around;
- the prepare/effect split cannot express a seam without a third phase;
- `__DEV__` shape assertions catch a real monomorphism break in ordinary use,
  meaning the frame factory should have stayed kernel-owned (F-2);
- M-1 shows the generic frame copy is measurable on the move path, or a
  supported lift mode cannot reach a scalar projection;
- a spring landing runner needs something from the kernel;
- a consumer legitimately unmounts or re-keys the dragged item during a drop,
  breaking the anchor constraint D-16 depends on (Q-12).
