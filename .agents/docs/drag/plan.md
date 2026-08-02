# `drag2` implementation plan

Source of truth: [`contract/`](contract/) documents 00–06, read with the
precedence stated in [`00-index.md`](contract/00-index.md) §Normative precedence.
[`packages/drag/docs/contract-probe-2/contract.ts`](../../../packages/drag/docs/contract-probe-2/contract.ts)
is a **type fixture only** — where it disagrees with the prose, the prose wins,
and the fixture is the bug.

## Ground rules for every phase

1. **Signatures come from the contract, not from the shipped package.** Where a
   shipped module is ported (queue, lifetimes, realm, lift), it is ported
   *behaviourally* and re-typed against the new ownership boundaries.
2. **No phase lands red.** Each phase ends with `npx just fmt`, `npx just
   lint-fix`, `npx just typecheck` and `npx just test` green from
   `packages/drag2`.
3. **Tests are written in the phase that introduces the behavior**, using the
   [05](contract/05-lifecycle-invariants.md) §Test matrix rows named in each
   phase's *Done when*. Phase 10 exists to close the residue, not to be the
   first time the matrix is consulted.
4. **Tier discipline.** Every invariant implemented at tier A or B must be
   demonstrated by a compile error (`@ts-expect-error`) or an executable test.
   Tier C invariants get a `__DEV__` assertion or a documented comment, never a
   silent assumption.
5. **Deviations are recorded.** If an executable case cannot be expressed
   through the frozen SPI, stop and write the failing case down — that is the
   only admissible trigger for a contract change (00 §Normative precedence).

## Placement

A new workspace, **`packages/drag2`** (`@ydinjs/drag2`), built alongside the
shipped `@ydinjs/drag`. The shipped package is untouched for the whole plan; the
merge back into `@ydinjs/drag` is Phase 12 and is a separate decision.

---

## Phase 0 — Workspace scaffolding

**Scope.** Create the package so every later phase has a working
build/test/typecheck loop.

**Deliverables.**

- `packages/drag2/{package.json,project.json,Justfile,tsconfig.json,eslint.config.ts,tsdown.config.ts,vite.config.ts,vitest.config.ts,typedoc.json,files.json,.size-limit.json,README.md}`,
  copied structurally from `packages/drag` and renamed to `@ydinjs/drag2`.
- `files.json` carries the **export topology** from
  [03](contract/03-feature-composition.md) §The export topology this requires,
  in full, from day one — `drag`, `sortable`, `sortable/vertical`,
  `sortable/callbacks`, `sortable/placeholder`, `sortable/handle`,
  `sortable/landing`, `sortable/layout-animation`. Entry files start as stubs.
- `.size-limit.json` gets the four M-3 compositions as *named, unbudgeted*
  entries. Budgets are added only after the first measurement (05 §Measurements).
- `tests/` skeleton mirroring the source tree, routed by the existing
  `createDragTestConfig` suffix convention (`.browser.test.ts` / `.node.test.ts`).

**Done when.** `npx just build`, `typecheck`, `test` all run green on an empty
package; each declared subpath resolves from a scratch consumer fixture.

**Why first.** The subpath topology is a measurement precondition (M-3) and
retrofitting it after the modules exist reliably reintroduces an eager barrel.

---

## Phase 1 — Kernel primitives

**Scope.** The non-lifecycle machinery the executor needs, ported from
`packages/drag/src/kernel` with the new ownership types.

**Deliverables.**

| Module | Content | Contract |
| --- | --- | --- |
| `realm.ts` | `DOMRealm` — **public** type (D-30) | 03 §public boundary |
| `lifetimes.ts` | `Lifetime` (signal, `use`, `useWhile`, latched best-effort LIFO `dispose`) and `LifetimeScope = Readonly<Pick<Lifetime,'signal'\|'use'\|'useWhile'>>` | D-21, 02 §ActivationScope |
| `queue.ts` | Two parallel arrays, FIFO, run-to-completion, terminal latch, panic. **Drain handler and panic callback hoisted to one per controller** | 02 §Queue |
| `reporter.ts` | Platform reporter — the best-effort channel (disposer failures, late holds, quality-path throws) | 02 §Failure on the quality track |
| `errors.ts` | `FailureStage` closed union + constants (**public**), `CancelStage` (**public**), stage→recovery table | 02 §Failure classification, D-31 |
| `presentation.ts` | `VisualLiftSession`: acquire, `composeXY`, `write`, latched style restore, lift modes | 01 ownership table |
| `pointer.ts`, `invalidation.ts` | Ported unchanged in behaviour | — |

**Geometry comes from `@ydinjs/box-quad`, not a ported coordinate walker.**
box-quad was written after the shipped drag package and is a strictly better
version of the same traversal — flat-tree (shadow-DOM aware), honest about 3D
instead of silently flattening it, origin derived from `getClientRects()` rather
than offsetParent arithmetic, with a caller-owned cache. Its API was reshaped
for this (both packages are pre-alpha, all call sites ours) into one DOM
measurement and one pure projection: `coordinates(element, out, recache?)`
writes the canonical `Box` — element→viewport matrix, untransformed border-box
size, ancestor zoom — and `projection(source, out, relativeTo?)` is scalar-only
basis conversion with no DOM access. drag2 has no coordinate module.

The shipped `animation.ts` is **not** ported here. It is the WAAPI helper the
landing runner needs, and pulling it into the kernel would put an optional
feature's dependency in the always-present layer. It lands with `landing()` in
phase 8b.

**Contract-driven changes vs the shipped versions.**

- `Lifetime.use()` on an already-disposed lifetime **invokes the disposer
  immediately and reports** (02 §Registration after closure).
- `dispose()` is never handed out — only `LifetimeScope` crosses the boundary.

**Done when.** Ported node tests pass; new cases: `use()` after dispose runs the
disposer immediately; one failing disposer does not stop the LIFO (I-19); a
nested `dispatch` during a drain appends and is reached in the same drain (I-1);
the drain handler identity is stable across outer dispatches.

---

## Phase 2 — Frame slicing

**Scope.** [04](contract/04-frame-slicing.md) in its entirety, with no lifecycle
attached yet.

**Deliverables.**

- `KernelFrame` (7 fields), `Frame<Part>`, `Draft<Part>` (with the deliberate
  `Omit`), `FramePartOf<Part>`, `FrameKeyCollision`.
- `composeFrame()` — `Object.assign(createKernelFrame(), part)`, no cast; called
  twice, **validating each factory result**.
- `validateFramePart()` — production check rejecting kernel keys, own
  `__proto__` data properties, symbol keys, non-enumerable/non-writable keys,
  accessors and non-plain prototypes. Proxies are explicitly *not* claimed.
- `begin()` / `commit()` / `scrub()` (`resetKernelFields` then
  `spec.resetFramePart`, each individually wrapped at teardown).
- `__DEV__` block: intra-controller key-set identity at `arm()`, post-scrub shape
  stability against `armedKeys`, descriptor re-validation, reset-completeness
  heuristic.

**Done when.** Matrix rows *Construction model*: both frames share a key set
(F-2); a part declaring `phase` is rejected in production and unwritable at the
authoring boundary; symbol-keyed and `__proto__` parts are rejected; the
**second** factory result returning a colliding key is rejected at `arm()`; a
`resetFramePart` that adds or deletes a key is caught in `__DEV__`. Plus
`@ts-expect-error` fixtures for `draft.phase = …` and `current.slot = …`.

---

## Phase 3 — The seam driver

**Scope.** [02](contract/02-kernel-behavior-contract.md) §The shared core — the
piece every later phase depends on and the one four separate findings
(F-19/F-27/F-34/F-40) were about.

**Deliverables.**

- `Transition<Part, Prepared, Capability>`, `SeamRejection`.
- `SeamOutcome` constants + `seamFailed`; `runCore` exactly as specified
  (begin → prepare → latch check → discard check → revalidate → rollback-or-
  commit → effect → latch check).
- `runLeaf` wrapper giving `moved`, `anchorTarget` and `finalized` identical
  throw/`host.fail` behaviour.
- Kernel-private `inSeam` and `seamFailureRequested` latches; `host.fail(stage,
  error)` classified only inside a seam of the current operation, downgraded to
  a platform report otherwise (D-28, F-23).
- Per-seam wrappers with their **own** discard and failure policies (the
  four-row table in 02 §The core returns an outcome).

  **Revised while implementing:** these landed as higher-order policies taking
  their continuations as callbacks (`runActivationSeam(driver, transition,
  capability, stage, { retire, committed })`), not as stubs. That is the real
  policy, fully testable against a fake now, and phase 4 supplies the actual
  callbacks — where a stub would have been speculative code. The settlement row
  is **not** here: its policy is "seal, then discard every unarmed request",
  which needs the settlement attempt, so it lands with phase 5. The `action`
  row is `runCore` plus a per-tag stage and needs no wrapper.
- `rollback` throw = best-effort report, never classified.

**Done when.** Matrix *Gates and drivers*: an `effect` throw is classified, not a
panic; a `rollback` throw is reported, not classified; **and** the
*Explicit failure latching* group's core assertion — each seam in turn calls
`host.fail` and returns normally, and no success continuation runs. Driver-level
tests use a fake spec, not the sortable behavior.

---

## Phase 4 — Kernel lifecycle: admission → activation → move → release → teardown

**Scope.** The executor proper, minus settlement (Phase 5).

**Deliverables.**

- `draggable(root, behavior)` and the two-phase handshake (D-1); `KernelHost`
  with its six members (D-2); `arm(spec)` including the **unwind** on any
  failure of the frame factories, validation, shape assertion or listener
  attachment (01 §When construction itself fails).
- Ingress listener, `admit` wrapping, and the **post-`admit` revalidation**
  before minting identity (D-26/F-30); a throwing `admit` becomes a
  controller-level `onError` report with `FAILURE_ADMISSION` and **no**
  operation (Q-1 as answered).
- `MOVE`: sample commit, threshold test, activation open; `originRect`, lift
  acquisition, `root.isConnected` check then `setPointerCapture` on `root`
  (D-17) with capture failure = `FAILURE_ACTIVATION`; guarded release disposer.
- `ActivationScope`; the activation wrapper's discard policy (**retire**) versus
  its failure policy (**no retirement** — the checkpoint owns it);
  `START_COMMITTED` re-checking `preparationValid()` **and the cancel latch**
  (F-32).
- `moved` on the hot path, kernel-wrapped (F-40).
- `ActionTransition` envelope, `dispatch(tag, argument)` with a static
  `config.actionTags` bound-check and `BEHAVIOR_BASE` offset.
- Release as **two commits** with motion disposal between them (D-6), and
  `ResolutionCommand` executed by the kernel only on `SEAM_COMMITTED`.
- Cancellation: synchronous `host.cancel` latch (I-21), precedence
  `DESTROY > CANCEL > FAILURE_CHECKPOINT` (I-22), `CancelStage`.
- Failure checkpoint, `REPORTING`, `ERROR_REPORTED`, `RETIRE`.
- `destroy()` — the **seven-step** teardown, each step individually wrapped,
  ingress abort in a `finally`, destroy never pins (01 §Teardown, D-29).
- The phase/action legality table from 02 §Phases and legality, as the
  authority for every handler's "ignore deterministically" branch.

**Done when.** Matrix *Basic flow*, *Boundary*, *Reentrancy* (`onStart` cancels /
destroys; a callback queues work then throws), *Resource cleanup* (destroy during
active movement, partial activation failure), *Teardown totality* (all four
rows), *Failure continuation* rows for activation and release, and
*Placeholder and admission*'s admission rows. Sortable is still a test-double
behavior at this point.

**Deviations recorded while implementing.**

- **`BehaviorSpec.reportFailure(stage, error)` is new.** Q-1 answers the
  admission case with "the kernel reports through `onError` with
  `FAILURE_ADMISSION` and no operation", but the kernel cannot reach `onError`
  — the consumer callbacks belong to the behavior's `callbacks()` slot, and
  `BehaviorSpec` had no hook that works without an operation. One member is the
  smallest way to make the answer implementable. Phase 5 will route the ordinary
  failure checkpoint through the settlement seam as a `SETTLED_FAILED` input as
  the contract specifies; `reportFailure` stays for the no-operation case only.
- **`runCore` gained an optional `effectStage`.** The action seam's two phases
  fail at different stages (`INSERTION` in `prepare`, `PLACEHOLDER_MOVE` in
  `effect`) and the driver classified both at one. This is kernel-internal, not
  part of the behavior SPI the phase-5 gate freezes.
- **The kernel stamps its own phase through a private slot consumed by
  `commit()`**, rather than through a seam-driver parameter. Activation writes
  `ACTIVATING` and settlement writes `SETTLING` *between* `preparationValid()`
  and the swap, which is the kernel's write and not expressible through
  `Draft<Part>`.
- **Phase 5 boundaries left explicit in `kernel.ts`:** `openResolution`,
  `settleCancellation` (a cancel at `ACTIVE`/`RELEASING` retires without a
  terminal callback for now) and the failure checkpoint's settlement input.

---

## Phase 5 — Settlement, gates and the join

**Scope.** [02](contract/02-kernel-behavior-contract.md) §Settlement gates and
§Landing — the densest failure surface in the contract.

**Deliverables.**

- Resolution attempt: object identity, guarded abort keyed off `completed`,
  double validation (I-4); thenable vs immediate settlement.
- `SettlementInput` as the five-case discriminated union; `SettlementTransition`
  returning `PreparedSettlement | SeamRejection`.
- `SettlementAttempt` record with all eleven fields; `SettlementScope` whose two
  methods **record a request and arm nothing**, ignoring-and-reporting duplicates
  and post-seal calls.
- **Request → seal → arm**, including: dropping every unarmed request on
  `SEAM_EFFECT_FAILED`; `authoredReady = readiness === null`; revalidation on
  **both** sides of `start` (F-38, F-30); `ArmOutcome`
  (`ARM_ARMED`/`ARM_STALE`/`ARM_FAILED`) with `ARM_FAILED` suppressing
  `advanceSettlement` and every terminal callback (F-35).
- Once-only `completeLanding` latch (D-28).
- Readiness watch bounded by `config.readinessTimeout` (default 500); rejection
  or timeout **replaces** the settlement, keeps presentation owned, leaves
  `authoredReady` false, reports through `onError` only.
- The readiness-time re-anchor guarded on `attempt.landingHeld`, with
  `anchorTarget`/`retarget` failures as **best-effort reports** (I-29, F-17).
- The join: `FINALIZING` commit → `anchorTarget` → `landing.destroy()` →
  `lift.write` pin → `presentation.dispose()` in a `finally` → skip `finalized`
  after a consequential failure → `RETIRE` (D-16, F-22, F-27).
- `LandingStart` / `LandingContext` / `LandingHandle` types (`retarget` optional,
  no `pin`).

**Done when.** Matrix groups *Readiness*, *Async attempts*, *Gates and drivers*,
*Landing completion* (all ten rows), *Landing target* (all rows), plus
*Failure paths*' readiness/join rows. Note explicitly in the tests that I-24 is
**not** claimed when `destroy()` throws.

**Gate.** Phases 3–5 are the frozen SPI. Any change to a seam signature after
this point requires the failing-executable-case justification from 00.

**Deviations recorded while implementing.**

- **The failure checkpoint drives the settlement seam stamped `REPORTING`, not
  `SETTLING`.** The contract gives the checkpoint no trace: the mapping table
  requires `settlement.prepare(SETTLED_FAILED)` to build the terminal state,
  while the phase table puts `onError` in `REPORTING`. Driving the same seam
  with the `REPORTING` stamp and a **pre-sealed** scope satisfies both — the
  behavior owns terminal classification, no gate can be held for a failed
  settlement, no join runs, and `ERROR_REPORTED` → retirement releases
  presentation. The input carries `stage`, which is what lets the behavior give
  `TERMINAL_CALLBACK` the "none" recovery the stage table names while the rest
  get immediate.
- **`LandingContext.from`/`.target` and `retarget()` are origin-relative
  deltas**, not viewport points. See README, deliberate differences.
- **The settlement seam closes motion as well as cancellation**, before the
  behavior's `effect`. The trace lists only `cancellation.dispose()`, because it
  traces a *release*, where motion is already closed. A cancel at `ACTIVE`
  reaches settlement with pointer input still open, and both closes are latched.
- **A raw throw from `settlement.prepare`/`effect` classifies as
  `FAILURE_REORDER_RESOLUTION`.** The contract names a stage for the seam's
  `SeamRejection` but not for an unannotated throw; this is the stage the seam
  owns, and it carries the home recovery the stage table gives it.
- **`failOperation` dispatches rather than enqueues.** A checkpoint raised from
  an async continuation — a readiness rejection, a landing runner's `fail()` —
  is the outermost frame, so nothing else would ever drain it.
- **Three guards are kept without a test that isolates them**, each redundant
  with a second mechanism and each named by the contract: `attempt.failed` after
  `start` (the latch already catches today's only route), `attempt.failed` in
  `advanceSettlement` (a failure never releases its hold, so the count cannot
  reach zero), and the phase half of the resolution's double validation. Marked
  as such in `kernel.ts` rather than left to read as tested.

---

## Phase 6 — The sortable behavior

**Scope.** [01](contract/01-construction-ownership.md) §The behavior instance,
02 §Seam-by-seam, [04](contract/04-frame-slicing.md) §`SortableFramePart` — with
features stubbed by hand-written slot literals (Phase 7 supplies the assembler).

**Deliverables.**

- `SortableFramePart` (8 fields) + `createSortableFramePart` / `resetFramePart`.
- `SortableRuntime` (seven mutable fields, `frame` non-nullable and created once
  per controller), `PresentationView`, `createSortableSpec`,
  `createSortableController`.
- Domain types: `CollectionSnapshot`, `Insertion`, `ReorderRequest`,
  `ReorderProposal`, `ReorderResolution` (value **and** type),
  `ReorderTransactionResult`, `SortableFinishResult`, `SortableCancelResult` —
  narrowed unions with string discriminants (D-31, F-41).
- Every seam: `admit`; `activation.prepare` (detached placeholder, offset-box
  sizing, home insertion with **real identity neighbours**) and
  `activation.effect` in **I-30 order**; `moved`; both action tags;
  `release.prepare`/`effect` including the **final lift render** (F-39) and
  `invoke: null` only for a proven `from === to` no-op; `settlement.prepare`
  implementing the five-row mapping table exhaustively; `settlement.effect`
  requesting holds; `anchorTarget` with the three-conjunct guarded re-anchor;
  `finalized` as an **exhaustive switch on the domain discriminant** (F-37);
  `retire`.
- One canonical `movePlaceholder()` anchored on `insertion.after` with an append
  fallback, inert when already in position (D-27), used by both the spatial
  action and release.
- `reconcileCollection` — pure, identity-based, the four survival rules — and
  the per-phase `PreparedCollection` staging table, with `cancelReason`
  dispatched **last** from `effect` (D-25, F-28).

**Done when.** Matrix *Collection*, *Collection staging* (all rows including the
`onStart` → `updateItems()` row), *Settlement mapping* (all five), *Terminal
protocol* (all six), *Placeholder movement* (all four), and the *Basic flow*
group re-run against the real behavior.

**Deviations recorded while implementing.**

- **`homeInsertion` is recomputed, never stored.** The frame part is fixed at
  eight fields and the runtime at seven, so the home gap a `RECOVERY_HOME`
  settlement returns the placeholder to has nowhere to live. Deriving it from
  the committed snapshot and item is pure, needs no slot, and cannot go stale
  against a collection replacement — the item's own index in the full list *is*
  the destination gap it occupies.
- **The displacement pipelines do not bracket the release move.** The trace
  shows `release.effect` calling `movePlaceholder` alone, and the hooks are
  specified as bracketing "a committed placeholder move" on the spatial path.
  If a fixture later shows the release move needs them, that is a behavior
  change, not an SPI one.
- **`DragErrorContext` lives in the sortable domain module for now.** The
  export table puts it in `drag.js`, but its `domain` field is a sortable
  result; phase 9 decides whether it is generic (`unknown`) or behavior-shaped.
- **Two switches suppress `default-case`.** Exhaustive discrimination is the
  point of both (F-29's five-row mapping, F-37's terminal routing): a `default`
  would turn a missing case from a compile error into a plausible-looking
  fall-through.
- **One guard is kept without a test that isolates it**: the spatial attempt
  comparison in `action.prepare`. The frame task coalesces and dispatches the
  latest sequence synchronously, so a queued attempt is always current when it
  applies. Marked as such in `spec.ts`.

---

## Checkpoint A — kernel machine + full lifecycle + real behavior

**What exists.** Everything the kernel owns, driving the real sortable behavior
against hand-written slot literals. No assembler, no feature modules, no public
entrypoints.

**What to review.** The parts that are expensive to change later and are now
fully observable for the first time:

- the driver's five outcomes and the four per-seam continuation policies, end to
  end through a real behavior rather than a fake spec;
- the settlement request→seal→arm sequence and the join's fallible ordering;
- teardown totality and the seven-step order under a real behavior's `retire()`;
- whether any seam signature needed a workaround in Phase 6 — the frozen-SPI
  gate says that is the only admissible trigger for a contract change, so it is
  found here or not at all;
- the hot path as written, ahead of M-1 (three post-`MOVE` indirect calls, one
  transform string).

**Exit.** Phases 4–6 tests green; any SPI concern is either written down as a
failing executable case or explicitly closed.

---

## Phase 7 — Feature composition

**Scope.** [03](contract/03-feature-composition.md) §A feature is a function
factory through §Assembly.

**Deliverables.**

- `FeatureContext` (with `report`, **not** `fail`), `SortableContribution`
  (flat, no discriminator), `InsertionGeometry` as the paired
  resolve/invalidate/retire capability (D-19).
- `assemble()` — `claim()` collisions naming both features, required-slot and
  `onReorder` validation, **cleanup recorded immediately after each factory
  returns**, unwind in reverse on any throw, single `reverse()`, contributions
  dropped.
- `SortableSlots` with the flattened geometry pair, `onStart` normalized to a
  shared module-level no-op and the other callbacks left nullable.
- The opaque brand: `declare const FEATURE_BRAND: unique symbol`,
  `SortableFeature` and `Behavior` as brand-only public types, `unbrandFeature`
  internal (D-30).
- Behavior call sites converted from Phase 6's hand-written slots to `slots.*`.

**Done when.** Matrix *Construction model*: a feature factory throwing
mid-`assemble` unwinds the hooks already collected; a **duplicate axis feature
cleans the rejected contribution's private state**; one throwing retire hook does
not stop the rest and hooks run in reverse installation order; a displacement
hook cannot reach `SettlementScope` (`@ts-expect-error`, I-10).

**Deviations recorded while implementing.**

- **`Behavior` carries its controller type.** The contract's brand sketch is
  parameterless (`Readonly<{ [BRAND]: true }>`), but `draggable()` has to infer
  what it returns, so the public type is `Behavior<Controller>` and the brand
  field carries the controller. The **frame part is erased** at the brand, which
  is the right direction anyway: it is the behavior's private type and no
  consumer names it. The install function survives internally as
  `BehaviorFactory<Controller, Part>`.
- **Two runtime brand helpers, not one.** The contract names only
  `unbrandFeature`. `brandFeature` and `brandBehavior` are its inverse and exist
  because the cast has to happen *somewhere*: putting it in one shared identity
  function keeps `as unknown as` out of every feature module and out of
  `behavior.ts`. Both are declaration-only in effect and construction-time in
  cost.
- **`SortableFeature` is declared in `sortable/feature.ts` and re-exported
  type-only from the `sortable.js` entry.** The contract asks for one resolvable
  identity across the separate declaration files, which a re-export gives; what
  it forbids is a *duplicate declaration* per subpath. Declaring it in the entry
  module itself would have dragged the authoring types (`FeatureContext`,
  `SortableContribution`) into the public entry's import graph.
- **`SortableCallbacks` lives beside `SortableContribution`**, because the
  contribution type references it and `sortable/callbacks.js` does not exist
  until 8a. That subpath re-exports the type when it lands.
- **`claim` labels the slot, not the two features.** The contract's compiled
  assembler does the same; "names both features" is a capability the
  full-contribution check *permits*, and features carry no name to print.
  Labels beyond the contract's table: `placeholder()`, `handle()`, `visual()`,
  `landing()`.
- **`ReorderResolution` was pulled forward from 8a into `sortable.js`.** The
  pack/extract fixture proved the entry had no runtime module at all: a type-only
  entry emits no `.js`, while the `exports` map's `default` condition promised a
  consumer one. The contract's export table already lists `ReorderResolution` as
  a runtime export of this subpath and the value has existed since phase 6, so
  the fix is the one line the topology was always going to need. The six feature
  subpaths stay runtime-empty until 8a/8b, recorded as an explicit pending set
  the fixture fails against once a phase lands one.
- **`drag.js.map` was missing from `files`.** `kernel/` and `sortable/` ship as
  whole directories and carry their maps along; the root entries are named file
  by file, so the root map was the one artefact the allowlist could silently
  drop while `drag.js` still pointed at it.
- **Nothing needed converting in the behavior.** Phase 6 already called
  `slots.*` throughout; the hand-written literals were only ever in the tests,
  which keep them — driving the behavior through a real `assemble()` is 8a's
  job, once real features exist to assemble.

---

## Phase 8a — The required minimal composition

**Scope.** The two required features, plus enough public surface to run
`sortable(items, vertical(), callbacks({ onReorder }))` end to end from outside
the package. No optional feature exists yet, so every adversarial case that does
not need one is exercised against the smallest possible build.

**Deliverables.**

- `vertical()` — packed `Float64Array` rect index (stride 6) + parallel element
  array + dirty flag + last-seen collection version; the nearest-centre rule with
  the placeholder as incumbent candidate; consumer-declared `InsertionFrameView`
  / `InsertionRuntimeView` in its own module (D-13, D-20).
- `callbacks()` — the consumer surface, sole owner of the `threshold` default;
  `OnReorder`; `ReorderResolution.accept/reject` with `presentationReady`
  **returned, not awaited**.
- **Minimal end-to-end public API**: `drag.js`, `sortable.js`,
  `sortable/vertical.js`, `sortable/callbacks.js` wired for real, with the
  public types they carry. The four remaining subpaths stay stubs from Phase 0.
- The behavior's own default placeholder mechanics
  (`data-drag-placeholder`, `aria-hidden`, inherited `slot`, offset-box sizing)
  exercised with **no** `placeholder()` feature installed.

**All adversarial cases that do not require an optional feature**, run through
the public entrypoint rather than internals: *Basic flow*, *Boundary*,
*Reentrancy*, *Async attempts* (resolution only), *Resource cleanup*,
*Collection* and *Collection staging*, *Settlement mapping*, *Terminal
protocol*, *Placeholder movement*, *Failure continuation*, *Explicit failure
latching*, *Teardown totality*, and the *Gates and drivers* row that matters
most here — **a behavior with no `landing()` but a pending readiness promise
still holds one gate and does not finalize in the resolution drain** (I-9).

**Done when.** The minimal composition passes every row above; the import graph
of the minimal fixture physically cannot reach landing, layout animation or any
unselected geometry.

**Deviations recorded while implementing.**

- **`InsertionFrameView` gained `item`.** The contract's two-field sketch
  (`insertion`, `pointerY`) is not sufficient to implement the rule it states
  in the same document: the destination view is the collection *minus the
  dragged item*, and an axis feature that cannot exclude it measures a lifted
  element whose centre tracks the pointer — so it wins every search and pins the
  gap to its own slot. Read off the frame rather than added to
  `InsertionRuntimeView`, because the item is already committed frame state and
  a second copy on the per-operation view could drift. `InsertionFrameView` is
  internal and unstable by the contract's own boundary, so this is a behavior
  -side widening, not a kernel-SPI change.
- **`vertical()` compares centres on Y only, and never queries DOM order.** The
  shipped `resolveSpatialInsertion` used a 2-D distance plus
  `compareDocumentPosition` to decide which side of `nearest` the gap falls on.
  The contract's rule is one-dimensional, and on a vertical axis "does `nearest`
  follow the placeholder" *is* "is its centre below" — which the scan has
  already measured. One fewer DOM call per resolution, and the axis assumption
  stays in one place.
- **`vertical()` measures the item, not `getVisual(item)`.** The shipped index
  measured the resolved visual. `getVisual` is a behavior slot, and reaching it
  from the axis feature would be a sibling-feature dependency in all but name;
  the contract's rule says "centres of every non-dragged item".
- **`sortable()` delegates to `createSortableBehavior`'s install seam.** The
  behavior module exposes both: the composed entry assembles inside the install
  function (a feature factory needs `realm` and `root`, and neither exists until
  the kernel has a host), while the slot-taking entry stays for the suites that
  drive a specific insertion or failure directly.
- **The adversarial matrix runs at two layers, not one.** The composed suite
  covers every group 8a names *that the public surface can reach*: basic flow,
  boundary, reentrancy, async resolution, resource cleanup, collection and
  staging, all five settlement mappings, the terminal protocol, placeholder
  movement, failure continuation, teardown totality, and the I-9 gate row. Rows
  that need a seam to throw on demand — explicit failure latching, an
  invalidation or scheduled-frame failure — stay in the slot-literal suite,
  because reaching them through the public API would mean shipping a feature
  whose only purpose is to fail.

**Contract amendment — I-31, decided after 8a.** A `cancel()` from inside
`onStart` produced no terminal callback: 02's phase table said a `CANCEL` at
`ACTIVATING` was abandoned. Amended, because the stated rationale ("nothing to
tell the consumer about yet") holds at `PENDING` and not here — `ACTIVATING` is
committed *before* `activation.effect`, so the presentation exists and `onStart`
has already run. **Once a start is notified, exactly one terminal callback
follows**: the cancellation settles at `AT_PROPOSAL` with a null proposal, which
is the case `CanceledReorderResult` already modelled.

The same pass closed a divergence 8a's composed suite exposed: `START_COMMITTED`
did **not** consult the cancel latch, contrary to 03 and 05, so an invalidating
`updateItems()` from `onStart` — whose cancel is queued *behind* the checkpoint —
activated for one drain and reported from `ACTIVE`. The checkpoint now defers
without retiring, leaving the phase at `ACTIVATING` for the cancellation to
settle. Amended in 02 §phase table, 02 §I-31 (new), 03 §`ACTIVATING` is handled,
and 05 (the *Reentrancy* row and F-32).

One gap is admitted rather than closed: a cancel latched from a custom
placeholder's `connectedCallback` **plus** a throwing `invalidateInsertion`
settles a drag whose start was never notified. Two faults are required, the
second already reports through `onError`, and closing it means carrying a
per-operation "started" flag. Documented at both ends.

---

## Checkpoint B — real feature assembly + the minimal composition

**What exists.** A complete, shippable minimal vertical sortable: real
assembler, real features, real public entrypoints, adversarial matrix green —
and **not one line of WAAPI, FLIP or optional-feature code**.

**What to review.** This is the last cheap moment to change the composition
model:

- the contribution/slot shape and the flattened geometry pair, now that two real
  features have filled them (D-19, D-12);
- the assembler's unwind, claim diagnostics and normalization rules under real
  factories;
- whether the consumer-declared view types held up without an import edge back
  to the behavior runtime (D-13, D-20), or whether `vertical()` needed anything
  the views could not express;
- the minimal build's module graph and first size reading — an early, informal
  M-3 signal, ahead of the real measurement;
- the gate semantics observed rather than reasoned about: readiness held with no
  landing feature installed.

**Exit.** Phases 7–8a green; any composition-model concern resolved before
optional features multiply the cost of changing it.

---

## Phase 8b — Optional features

**Scope.** The five optional features, one module each, no sibling import edges,
no import edge to the behavior runtime.

**Order.** `placeholder()`, `handle()`, `visual()`, `landing()`, then
`layoutAnimation()` last behind its gate.

**Deliverables.**

- `placeholder()` — customisation only; the default mechanics validated in 8a
  stay in the behavior and are not moved here.
- `handle()` / `visual()` — pure resolvers, one module, one subpath.
- `landing()` — WAAPI runner honouring `prefers-reduced-motion`, `run` full
  replacement, optional `retarget`, `destroy` relinquishing the transform.
- `layoutAnimation()` — FLIP over a private element map, retargeting from the
  computed transform, retire restoring each touched element exactly once.

**Q-7 gate — blocking, before `layoutAnimation()` ships.**
[05](contract/05-lifecycle-invariants.md) §Q-7: settle which elements the
displacement set contains, and measure whether `vertical()`'s index rebuild and
`layoutAnimation()`'s before/after measurements can share **one** layout read
around the committed placeholder move. If they cannot be shared cheaply,
introduce a behavior-owned read phase or a small shared geometry-read capability
— duplicating a full-list measurement to preserve conceptual privacy is
explicitly the wrong trade. This is M-4; its result may change
`SortableContribution`, which is why 8a and Checkpoint B deliberately precede it.

**Done when.** Matrix *Styling and animation*, the *Landing completion* and
*Landing target* groups re-run with the real `landing()` runner rather than a
test double, the *Placeholder and admission* geometry rows (already-correct
start/internal/end gap performs no reinsert; shadow-DOM press; iframe-hosted
root), and Q-7 answered in writing with numbers.

---

## Phase 9 — Public surface

**Scope.** Freeze what ships. Phase 8a already built the minimal half of this;
here the remaining four subpaths join it and the whole surface is closed.

**Deliverables.**

- Entry modules matching the export table exactly; `SortableFeature` declared in
  `sortable.js` and re-exported nowhere; `draggable` on its own `drag.js`.
- Public: `Point`, `DragErrorContext`, `FailureStage`, `CancelStage`, `DOMRealm`,
  the request/proposal/result types, `ReorderResolution` as value **and** type.
  Internal and unexported: every seam, spec, host, scope, contribution, slot and
  phase/outcome/recovery constant (03 §The public/internal boundary).
- `files.json` finalized; `typedoc.json` entry points; README + a migration note
  against `@ydinjs/drag`.
- A consumer type-fixture test asserting the public results **narrow without
  importing an internal constant** (F-41), and that a hand-written
  `SortableFeature` literal does **not** typecheck (D-30).

**Done when.** `npx just build` emits every subpath with declarations; the
fixture consumer compiles; no internal identifier appears in any emitted `.d.ts`.

---

## Phase 10 — Test matrix closure

**Scope.** Every row of 05 §Test matrix not already covered, plus the React
fixture work.

**Deliverables.**

- Readiness resolved from a real `useLayoutEffect()` fixture; authored commit
  inserting content above the placeholder; authored commit inserting a new keyed
  item into the destination gap; the dragged item unmounted by the authored
  commit (**Q-12** — record whether the degraded fallback proved sufficient).
- A coverage map: matrix row → test file → invariant ID, checked in beside the
  tests.
- **F-6 obligation**: any fixture installing `landing()` or supplying
  `presentationReady` fails loudly if the corresponding hold is never taken.

**Done when.** Every matrix row maps to a passing test or to a written,
justified exclusion.

---

## Phase 11 — Measurements M-1 … M-4

Each needs the reproducibility standard from 05 §Measurements owed *checked in*:
workload and harness, named engines and versions, warm-up and GC policy, counts
under test, sampling and statistics.

| # | Work | Decides |
| --- | --- | --- |
| M-1 | Browser trace of the move path: generic 15-field `Object.assign` vs a specialized pointer-publication path vs shipped `@ydinjs/drag`, across multiple behavior frame shapes, with a correctness-equivalence check for any specialized path | whether the generic frame copy stays; I-26's honest number |
| M-2 | Heap and move-call behaviour at realistic controller counts: closure model vs opaque-`S`-plus-static-spec; **and** three frame-task policies — eager-retained, lazy-retained, per-operation | F-4, and the frame-task allocation policy |
| M-3 | Four fixtures (minimal; +`layoutAnimation()`; +`landing()`; complete) minified + Brotli, with module-graph assertions naming each module that must be **absent**, plus a feature-matched non-composed baseline **and** shipped `sortable.js` as a separate migration baseline | the tree-shaking claim; the first size budgets |
| M-4 | Already executed as the Phase 8b Q-7 gate; written up here | the displacement element set and the shared layout read |

**Carried into M-3: the `DEV` strip mechanism.** Phase 2 landed the dev-only
frame assertions behind a module constant resolved from `process.env.NODE_ENV`,
which gives in-repo tests the checks but does **not** remove them from a
production build — the contract asks that they compile out. Stripping needs a
build-time `define` replacing a bare identifier, a new mechanism for this
repository. M-3 is where the carried weight becomes visible, so the decision is
made there rather than assumed now.

**Done when.** Each measurement replaces the corresponding intuition-based
sentence in the contract documents, in place, with a dated result. Size budgets
are added to `.size-limit.json` only now. Report M-3's two baselines separately
and never substitute one for the other.

**Sign-off gate.** The contract's own definition: measurements landed, Q-7
answered, matrix closed. Only then is `drag2` a candidate to replace
`@ydinjs/drag`.

---

## Phase 12 — Cutover (separate decision)

Not started until Phase 11 signs off. Migrate `@ydinjs/material-x` consumers and
the drag stories onto the new entrypoints, port or retire
`packages/drag/src/sortable/keyboard.ts` (which the contract expects to **revise
the kernel contract** rather than be worked around — 02 §`ActionTransition`),
then either rename `@ydinjs/drag2` → `@ydinjs/drag` or fold the tree in and
delete the old one. Update `packages/material-x/files.json` and the root docs.

---

## Dependency graph

```text
0 ─▶ 1 ─▶ 2 ─▶ 3 ─▶ 4 ─▶ 5 ─▶ 6 ─▶ ⓐ ─▶ 7 ─▶ 8a ─▶ ⓑ ─▶ 8b ─▶ 9 ─▶ 10 ─▶ 11 ─▶ 12
               │                  │                 │
               └ frozen SPI gate  └ Checkpoint A     └ Checkpoint B
                                                       + Q-7 / M-4 gate (in 8b)
```

Phases 1 and 2 are independent of each other and can run in parallel. Everything
from 3 onward is sequential: the driver is the substrate for the lifecycle, the
lifecycle for the behavior, the behavior for the features.

The two checkpoints sit at the points where the next phase multiplies the cost
of a change. **A** reviews the kernel machine while only one behavior depends on
it; **B** reviews the composition model while only two features depend on it,
and before any WAAPI or FLIP code exists.

## Risks carried into implementation

| Risk | Contract ref | Handling |
| --- | --- | --- |
| Duplicate full-list layout reads dominate the frame | Q-7 | Blocking gate in Phase 8b, after Checkpoint B has frozen the composition model |
| Closure-per-controller cost | F-4 / M-2 | Measured; the swap is mechanical and semantics-free |
| Generic frame copy on the move path | F-24 / M-1 | Measured; a specialized path needs an equivalence check |
| `resetFramePart` exhaustiveness | F-11, I-28 | `__DEV__` heuristic only; known and unsolved in both probes |
| Keyboard sorting needs a lifecycle transition | Q-4, 02 §`ActionTransition` | Explicitly deferred to a kernel-contract revision, not a third tag |
| Consumer breaks I-25 (unmounts the dragged item) | Q-12 | Guarded fallback is normative; Phase 10 fixture judges sufficiency |
