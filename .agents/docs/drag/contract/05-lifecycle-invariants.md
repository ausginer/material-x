# 5. Lifecycle invariants, findings and open questions

The invariant table, open questions, measurements owed and test matrix are
normative. Finding sections preserve the review history and rationale; where an
older finding narrative conflicts with a later decision or documents 00–04, the
later decision and documents 00–04 win.

## Invariants, by enforcement tier

I-1…I-28 are inherited from the shipped package and probe 1. **I-29 and I-30 are
new**, introduced by this model's failure and post-commit ordering rules. The
column that matters is the tier:

- **A — frame publication safety.** The violation does not compile, or is
  unexpressible through the API.
- **B — kernel-enforced sequencing.** The kernel orders it; a participant has no
  opportunity to get it wrong. Not a type property.
- **C — discipline.** A contract rule a participant must obey. The API permits
  violation.

Probe 1 had every one of these at tier C.

| ID | Invariant | Tier | Mechanism |
| --- | --- | --- | --- |
| I-1 | FIFO run-to-completion; a nested `dispatch` appends and never interrupts; each entry keeps its own argument. **Native admission is a queue boundary**: a dispatch from a handle/visual resolver enqueues without draining until admission commits or abandons, because admission is a transaction with no drain on the stack to append to (§[02](02-kernel-behavior-contract.md) §Queue semantics) | B | Kernel-private queue and drain |
| I-2 | Preparation may not assign a **top-level** committed frame slot | **A** | `prepare` never receives `current`. Referent immutability is separate — see below. |
| I-3 | Nothing is published until the operation is revalidated after `prepare` | B | The kernel's driver checks unconditionally between prepare and commit |
| I-4 | Async completions are validated twice: at the producer boundary and when the queued action is applied | B | Both checks are kernel code |
| I-5 | Only the kernel writes kernel frame fields | **A** + B | `Draft<Part>` omits kernel keys then re-adds them `readonly`; `FramePartOf` rejects a colliding part at authoring; `validateFramePart` rejects one in production |
| I-6 | `destroy()` is synchronous and terminal; physical release completes before it returns; no callback fires afterwards | B | Seven-step teardown, §[01](01-construction-ownership.md) |
| I-7 | During a long landing the lift and placeholder stay owned; `destroy()` cleans them immediately; a stale completion is inert; styles restore exactly once | B | Attempt validation + latched style lease |
| I-8 | The two settlement gates are independent; neither awaits the other | B | Independent slots on the settlement attempt |
| I-9 | Absence of a `landing()` feature creates **no landing work and no landing hold**. It does not affect the readiness gate. Same-drain finalization requires *neither* gate held. | B | The landing hold is requested only when the `startLanding` slot is filled; readiness is requested independently, off the staged resolution |
| I-10 | Layout displacement is never a lifecycle gate | **A** | `SettlementScope` is passed only to `settlement.effect`; a displacement hook cannot reach it |
| I-11 | Release closes motion after `RELEASING` is committed and before the final geometry is measured | B | The kernel sequences both commits and the disposal between them (D-6); `LifetimeScope` withholds `dispose()`, so the behavior cannot close motion itself |
| I-12 | Exactly one immutable proposal per operation, built after motion is closed | B + C | **B:** the kernel sequences release, so whatever proposal exists is built after the disposal. **C:** every `prepare` receives the whole mutable behavior part, so `release.prepare` being the *only* writer of `proposal` is behavior discipline, not a type property. |
| I-13 | No **kernel-ordered** irreversible action occurs while the committed frame describes a state that action has invalidated | B | Generalised from D-6. Scoped to actions the kernel sequences — motion closure, capture release, presentation disposal. Arbitrary irreversible work inside a behavior `prepare`/`effect` is outside the capability model and stays tier C. |
| I-14 | Collection reconciliation is identity-based; intent is never recomputed from a later pointer position | C | Behavior rule, unchanged |
| I-15 | The insertion rule cannot oscillate: the placeholder is an incumbent candidate | C | Feature rule, unchanged |
| I-16 | A staged value from `prepare` reaches exactly one of `effect` or `rollback` | B | The driver branches |
| I-17 | Ownership of external resources transfers only at commit | C | Discipline. Physical acquisition inside `prepare` precedes the swap. Vacuous for vertical sortable — see below. |
| I-18 | A committed transition is never silently reverted by a post-commit failure | **A** | `effect` runs after the swap and cannot express a revert |
| I-19 | Cleanup is idempotent and best-effort; one failing disposer or retire hook does not prevent the rest | B | Latched LIFO `Lifetime.dispose()`; the kernel wraps `spec.retire()`, and `assemble` wraps each feature retire hook individually |
| I-20 | An idle controller retains no DOM from a completed drag | C | Depends on `resetFramePart` being exhaustive (unprovable, F-11) and on every feature hook actually restoring its elements. The *mechanism* is kernel-driven; the *outcome* is not enforceable. `__DEV__` heuristic only. |
| I-21 | First valid cancel per operation wins; idle cancel is a no-op leaving no latch; cancellation cannot be followed by resurrection | B | Kernel-private latch, unreachable from the behavior |
| I-22 | Precedence `DESTROY > CANCEL > FAILURE_CHECKPOINT` | B | Kernel-private |
| I-23 | Terminal callbacks run after presentation release, so the consumer observes its own authored DOM | B | `finalized()` is called after `presentation.dispose()` |
| I-24 | **When the authoritative measurement succeeds, the pin succeeds, and runner control was successfully relinquished**, the pinned visual position and the authored DOM position agree at presentation release | B | The kernel re-measures and pins at the join, after `anchorTarget` (D-16). All three conditions are required: `anchorTarget` is behavior-supplied, the pin is a DOM write, and a `LandingHandle.destroy()` that throws may leave a WAAPI animation or rAF loop still writing the transform *after* the pin. The contract skips the pin on the first two and reports the third, while **still** releasing presentation. It also depends on I-25. |
| I-25 | The semantic item remains a connected, consumer-owned keyed child until presentation release | C | **Sortable presentation strategy**, not a kernel guarantee. See below. |
| I-26 | After operation setup, one pointer sample creates no wrapper, tuple, collection or protocol object | C | **Counted by inspection**, §[06](06-vertical-sortable-trace.md) — not measured; M-1 is still owed. It *does* create the CSS transform string. |
| I-27 | Part factories are deterministic and folded in a fixed order for both frames | C | `__DEV__` shape assertion |
| I-28 | `resetFramePart` clears every reference-bearing field | C | `__DEV__` heuristic; not provable |
| I-29 | No failure on the trajectory-quality path may change the settlement outcome, release or add a hold, or destroy the runner | B | Readiness-time `anchorTarget`/`retarget` failures are best-effort reports, not classified failures |
| I-30 | Within a post-commit `effect`: register each release before making the resource visible; publish private references only once every resource is owned; invoke consumer callbacks last | C | §[02](02-kernel-behavior-contract.md) §Post-commit ordering |

**I-2 and I-18 are tier A for top-level frame slots only.** `Readonly<Frame<Part>>`
is shallow, and `begin()` shallow-copies, so both frames reference the same
nested objects: `current.insertion.index = 4` from inside a `prepare` or an
`effect` mutates committed state and neither type stops it. Immutability or
replace-on-write of frame *referents* is tier C, enforced only by the
shallow-copy contract (§[04](04-frame-slicing.md)). This matters most for a
custom behavior, whose part's nested values the kernel cannot inspect.

**I-17 deserves a note.** It is tier C — the API cannot prevent a `prepare` from
acquiring an external resource or writing the DOM. For vertical sortable it is
nonetheless *vacuous*: after D-17 moved pointer capture to the kernel and the
placeholder insertion moved into `activation.effect`, `activation.prepare`
creates a detached element, measures it, and returns it. It performs no
externally visible mutation at all. That is a property of the reference
behavior, and it is what `rollback` being unused signifies.

**I-25 is the load-bearing constraint of the sortable presentation strategy**,
and it belongs there rather than to the kernel. The visual may be distinct from
the semantic item — `visual()` exists precisely for that — but the *anchor* is
always the item. A future behavior with no collection and no keyed children owes
nothing to this invariant.

## Findings

### F-1 — callback count · note, not a finding

Twelve top-level `BehaviorSpec` members, ~16 functions once the transitions
expand, against probe 1's fifteen. A wash. The split is what buys tier A and B
for I-2, I-3, I-5, I-16 and I-18, and grouping into `Transition` objects keeps
the surface legible. `moved` stays a top-level field, so the hot path takes no
extra property hop.

### F-2 — part factory determinism · open, tier C

`Object.assign`-based composition means the two frames of one controller share a
map only if every part factory returns the same key set in the same order every
time, and the kernel folds them in the same order. TypeScript proves neither.

Much narrower than before D-15, which removed the kernel-slice half of this
finding entirely: the behavior can no longer mis-initialise fields it cannot
name. **Mitigation:** the kernel folds from one code path, called twice, plus the
`__DEV__` key-set assertion.

### F-4 — a closure graph per controller · accepted, measurement owed

D-4 keeps the behavior's runtime private by capturing it in closures, so each
controller allocates its own `BehaviorSpec` plus ~16 function objects, and each
call site sees a different function identity.

The alternative — the kernel storing one opaque `S` and threading it as argument
zero, making `BehaviorSpec` a module-level frozen constant — is better for memory
and inline caches. The earlier rejection ("it requires the kernel to *hold*
behavior state, changing the honest description of H-2") **does not survive
scrutiny**: holding an untyped reference does not make the kernel know, expose or
structurally widen that value, and H-2's substance — that the kernel cannot reach
into behavior state — is preserved exactly by a phantom `S`.

The closure model ships because it is simpler to specify, not because it is
faster. Since performance is this repository's first code-style priority, the
measurement is owed before that choice is treated as settled: heap and move-call
behaviour at realistic controller counts, both models. The swap is mechanical
and touches no semantics.

### F-5 — `admit` runs inside native dispatch · resolved

`admit` is the one seam the kernel calls outside the queue, because
`composedPath()`, handle resolution and `preventDefault()` are valid only during
native dispatch. A behavior can therefore throw into the browser's event loop
rather than into the failure model. The wrap is three lines:

```ts
let visual: HTMLElement | null;
try {
  visual = spec.admit(event, draft);
} catch (error) {
  fail(FAILURE_ADMISSION, error);   // queued, not thrown at the browser
  return;                           // draft abandoned; controller stays idle
}
```

Whether to adopt it is Q-1: the shipped package deliberately lets a throwing
admission factory escape the listener, and the change is observable.

### F-7 — landing-target arithmetic duplicates across behaviors · accepted, minor

The behavior owns `anchorTarget`, because it is the party that knows where its
footprint is. A second behavior reimplements the delta arithmetic. The answer is
a **pure exported helper**, never a seam — probe 1's warning about the kernel
becoming "a directory of unrelated helper functions" is about the seam surface,
the thing a behavior author must implement.

### F-9 — the kernel cannot type the consumer resolution · neutral

`ResolutionCommand.invoke` threads an `unknown` back to `settlement.prepare`
with a status code. Probe 1 already required the *behavior* to validate that a fulfilled
value is an explicit resolution; the kernel merely stops pretending to know a
type it never inspected.

### F-10 — contribution objects are polymorphic at the assembler · non-issue

Each feature returns a differently-shaped literal, so the assembler's ~10
property reads are megamorphic. Construction time, once per feature. Recorded so
it is not rediscovered as a hot-path concern.

### F-11 — reset exhaustiveness is unprovable · open, tier C, inherited

Nothing proves `resetFramePart` clears every reference-bearing field. The
`__DEV__` heuristic catches retained objects but not stale scalars. Identical in
probe 1.

### F-12 — teardown crosses two owners · resolved by contract

`spec.retire()` may throw, and it runs while the behavior's DOM is still
attached. Both are addressed by the normative seven-step order in
§[01](01-construction-ownership.md): the kernel wraps `retire()` in
try/catch/report/continue, and `retire()` drops references while the
*presentation lifetime* releases DOM.

### F-13 — the landing target goes stale under a concurrent authored commit · confirmed, resolved

Established by the React probe. A frozen `CollectionSnapshot` freezes the
semantic transaction; it says nothing about layout. An authored commit that
inserts, removes or resizes content above the placeholder moves the
placeholder's viewport rect while landing is running.

Resolved by D-16: the target measured at settlement entry is explicitly
**provisional**, and the kernel re-measures and pins authoritatively at the join
before releasing presentation (I-24).

### F-14 — React repositions or detaches the injected placeholder · disproved

The probe establishes that React does **neither**. The placeholder is an
unmanaged sibling in a reconciled container and survives commits in place. This
finding is withdrawn; the earlier speculation that it might require abandoning
the injected-placeholder strategy is not supported.

### F-15 — the placeholder can end up in the wrong semantic gap · confirmed, resolved

A *new keyed item* inserted into the destination gap by the authored commit
leaves the placeholder on the wrong side of it. The placeholder's position is
still physically where we put it (F-14), but it is no longer the correct
*semantic* gap.

Resolved by D-16's re-anchor: at readiness, and defensively again at the join,
the behavior runs the guarded equivalent of `item.before(placeholder)`. The
probe establishes that the repaired placeholder rect equals the dragged item's
actual landed rect after teardown, and that the repair is inert in the
already-correct cases.

The guard is required, not optional: `Node.before()` on an already-correct
position is a remove-and-reinsert, which resets CSS transitions on the
placeholder and forces a reflow.

```ts
if (placeholder.nextElementSibling !== item) { item.before(placeholder); }
```

### F-16 — a late readiness correction can be visually abrupt · accepted, quality only

When a short landing completes *before* readiness, the provisional trajectory has
already finished, and the authoritative correction at the join is a visible step
rather than a smooth arrival.

Correctness is unaffected (I-24 holds in both completion orders — the probe
tested both and got the same authoritative pinned target). A retargetable runner
smooths it; the kernel guarantee does not depend on one, and `retarget()` stays
optional for exactly that reason.

In precisely this case `retarget()` is **not** called: the readiness path is
guarded on `attempt.landingHeld`, not on the handle, which is deliberately
retained past its gate release so the join can `destroy()` it. Calling
`retarget()` on a runner that has already reported `done()` would require a
runner obligation ("`retarget()` after `done()` must be a safe no-op") that buys
nothing — a completed trajectory cannot be improved.

### F-17 — the quality path can throw · resolved by contract

`anchorTarget()` at readiness and `retarget()` are both fallible, and neither is
load-bearing: the join re-measures and pins authoritatively regardless. Treating
either as a classified failure would settle the operation with `OUTCOME_FAILED`
over a blip the very next step is about to correct.

Both are therefore **best-effort reports** — the platform reporter, the same
channel as a failing disposer — with the landing left running, holds untouched,
and `attempt.authoredReady` still set. Only the join's measurement is classified
(`FAILURE_LANDING_TARGET`), and even that releases presentation rather than
stranding the controller. The full table is in
§[02](02-kernel-behavior-contract.md) §Failure on the quality track.

### F-18 — a post-commit effect can leave a visible unowned resource · resolved by contract

`prepare` has `rollback`; `effect` does not. An effect that inserts the
placeholder and *then* registers its removal leaves a window where a throw
produces a visible orphan the presentation lifetime does not own.

Resolved by I-30's ordering rule. Registering first is free, because removing a
detached node is a no-op — an over-eager disposer can never over-release.

### F-19 — the generic transition driver was not total · resolved by contract

One driver was shown for every seam, but four callers needed something it did
not provide: an `effect` throw escaped to panic instead of being classified; a
`rollback` throw had no policy; an activation discard needed seam-specific
retirement; and the activation trace performed a post-effect `preparationValid()`
the driver did not have.

Resolved by keeping one **core** and giving each seam its own wrapper with its
own discard and failure policy (§[02](02-kernel-behavior-contract.md) §The
shared core). Two of the four discards stopped being expressible at all.

### F-20 — legal `null` returns could strand an operation · resolved by types

`release.prepare` returning `null` left a truthful but stranded `RELEASING`
operation: no resolution, no failure, no retirement. `settlement.prepare`
documented `null` as "after queueing a failure", which the kernel could not
verify once the resolution payload was consumed.

Both are now non-nullable. Release stages a `ResolutionCommand`; settlement
returns `PreparedSettlement | SeamRejection` and the kernel classifies the
rejection itself. The `ResolutionGate`'s `open`/`skip` linearity problem
disappears with it — the choice became a value.

### F-21 — synchronous landing completion raced the hold · resolved by contract

A `duration: 0` or custom runner can call `done()` from inside `start`. With the
hold installed *after* `start` returned, that completion was either dropped
(stranding settlement) or applied against a half-built attempt.

Resolved by *request → seal → arm*: holds are reserved during
`settlement.effect`, the plan is sealed, and only then is the watch armed and the
runner started. The handle is published before any queued completion can be
applied. A `start` throw rolls the reserved hold back.

### F-22 — cleanup was not robust across code the kernel does not own · resolved

The join calls a behavior measurement, a possibly-custom `LandingHandle.destroy()`
and a lift write, then releases presentation — and any of the three could skip
the pin *and* strand temporary presentation. Feature retire hooks had the same
shape: a plain array, with only the outer `spec.retire()` wrapped.

Resolved by putting presentation disposal in a `finally`, making runner
destruction a best-effort report, classifying the pin failure without letting it
prevent release, and wrapping each retire hook individually in reverse
installation order.

### F-23 — long-lived `fail(stage, error)` could fail the wrong operation · resolved

`fail` targets whichever operation the kernel currently holds, so a late
asynchronous callback belonging to operation A could classify a failure against
operation B — contradicting the double-validation rule everything else obeys.

Resolved three ways: seam throws are caught and classified by the driver; the
kernel's `inSeam` latch downgrades an out-of-seam `fail` to a platform report;
and the long-lived `FeatureContext` carries `report(error)` instead of `fail`.
`stage` is also a closed `FailureStage` union rather than a bare `number`, so a
participant cannot forge a kernel-private stage.

### F-24 — hot-path accounting was internally inconsistent · withdrawn and restated

The trace claimed "zero allocations, two indirect calls" and then, two lines
later, acknowledged the transform string. The shown path also makes three calls,
not two (`spec.moved`, `lift.composeXY`, `rt.frame.schedule`), and the shipped
in-place lift mode allocates a `{ x, y }` projection
(`packages/drag/src/kernel/presentation.ts:190-224`).

The headline is withdrawn rather than defended. I-26 is restated as something
measurable, and the falsifier that referenced it is gone from
§[00](00-index.md). See §[06](06-vertical-sortable-trace.md) §The hot path for
the counted version.

### F-25 — the reentrant-cancel counterfactual reversed FIFO · corrected

The trace claimed that a `cancel()` called from inside `onReorder` loses because
`RESOLUTION_SETTLED` is already ahead of it. **That is backwards.** The
resolution command must invoke consumer code before it can obtain a value to
settle, and a nested `dispatch` appends in call order — so `cancel()` enqueues
*first*, and `RESOLUTION_SETTLED` can only be enqueued after `onReorder`
returns. **The cancel wins; the later completion is stale.**

The shipped package confirms the order: callback invocation at
`packages/drag/src/sortable/runtime/actions.ts:925-950`, settlement dispatch at
`952-964`, cancellation dispatch at `1450-1477`.

This is the concrete example of `CANCEL > FAILURE_CHECKPOINT` and FIFO working
as specified, not an exception to them, and it is now an explicit test rather
than a counterfactual row.

### F-27 — classification did not stop incompatible continuation · resolved

The core driver returned a `boolean`, conflating *discarded* with *failed*. Every
caller then continued success work between a classified throw and the queued
failure checkpoint: activation retired the operation out from under its own
`FAILED` entry, release invoked `onReorder` after its effect threw, settlement
armed a half-requested gate plan, and the join called `finalized` — emitting
`onFinish` for a drop the checkpoint was about to report through `onError`.

Resolved by `SeamOutcome` and a stated continuation rule per seam
(§[02](02-kernel-behavior-contract.md) §The core returns an outcome). **F-19 was
not actually resolved before this**: catching a throw is only half of a failure
model.

### F-28 — an invalidating collection replacement was discarded · resolved

The invalid paths called `host.cancel(reason)` and returned `null`, which skips
`effect` — so the cancellation landed but the consumer's collection update was
thrown away, and the next press started against stale items.

Resolved by staging `cancelReason` in `PreparedCollection` and dispatching it
last from `effect`, after publication. An invalid collection ends the current
drag; it does not un-happen the update that ended it.

### F-29 — settlement status had no total mapping · resolved

Five open statuses, no exhaustive mapping to outcome, recovery, domain result,
callbacks and failure stage — so the reference behavior mapped every
non-fulfilled status to rejection with home recovery, turning a semantic **no-op
into a rejected drop** that animates home and calls `onCancel`.

Resolved by a discriminated `SettlementInput` covering all five cases —
fulfilled, rejected, skipped, canceled and failed — with an exhaustive mapping
to outcome, recovery, domain result and callback. `OUTCOME_NOOP` prevents a
semantic no-op from becoming rejected/home. A rejected thenable is a named
classified failure rather than an inferred consumer verdict. The temporary
three-case version was withdrawn by F-33: cancellation/failure are kernel-
triggered, but the terminal domain fields they produce are behavior-owned.

### F-30 — a resource returned from a reentrant callback could leak · resolved

Reserve-before-call protects resources that already exist. It does nothing for a
resource the callback *returns*: a `LandingStart` that synchronously destroys the
controller and then returns a live handle left that runner owned by nobody, on a
retired attempt. The same hole existed at admission, where a consumer resolver
can `destroy()` during native dispatch and the listener carried on to mint an
operation.

Resolved by post-callback revalidation at both ends, with immediate best-effort
destruction of a stale returned handle — and stated as a general rule rather
than two patches.

### F-31 — the placeholder writer could not express a start gap · resolved

The reference moved the placeholder with `insertion.before?.after(placeholder)`,
which is a silent no-op when `before` is `null` — so the placeholder could never
reach the head of the list. `homeInsertion` compounded it by producing
`before: null, after: null` regardless of the item's real neighbours.

Resolved by one canonical `movePlaceholder()` used by both the action and
release effects (anchor on `after`; append when it is `null`), and a
`homeInsertion` that carries real identity neighbours. Keeping one writer also
protects the non-oscillation rule from divergent implementations — and gives the
cross-container refusal a single home: the writer rejects an anchor whose parent
is not the placeholder's, so a reparented item cannot silently relocate the
footprint out of the list (D-27).

### F-32 — the `ACTIVATING` collection deferral contradicted FIFO · resolved

The table claimed an update arriving during `ACTIVATING` was queued behind the
activation checkpoint. It cannot be: `onStart` runs before `START_COMMITTED` is
dispatched, so an `updateItems()` from inside it is appended first and FIFO runs
it first.

Resolved by **deleting the deferral**. I-30 already publishes `rt.view`,
`rt.placeholder` and `rt.lift` before `onStart`, so an `ACTIVATING` frame is as
reconcilable as an `ACTIVE` one. No pending slot, no requeue, no anti-spin rule.

The invalidating case then has an ordering of its own: the cancel is raised by
the collection action's *effect*, so it is queued **behind** `START_COMMITTED`
rather than ahead of it. `START_COMMITTED` consults the latch and declines to
advance, leaving the phase at `ACTIVATING` for the cancellation to settle
(§[02](02-kernel-behavior-contract.md) §I-31). Without that check the operation
would activate for exactly one drain and report the cancellation from `ACTIVE`.

### F-33 — kernel-owned cancel/failure could not build behavior-owned state · resolved

Removing `canceled` and `failed` from `SettlementInput` created an ownership
hole. `outcome`, `recovery` and `domain` are fields of the **behavior's** frame
part, which the kernel cannot name or write, and `BehaviorSpec` has no other
terminal-classification hook — so a kernel `CANCEL` could commit `SETTLING` and
then had no way to produce the canceled result `onCancel` requires, and the
failure path could not choose a behavior-owned recovery.

**Ownership of the trigger and ownership of the resulting domain state are
different things.** All five cases go back to `settlement.prepare`, discriminated
and exhaustively mapped (§[02](02-kernel-behavior-contract.md)). The original
defect was the open numeric status and the missing mapping, not that the
behavior classified behavior-owned state.

### F-34 — `host.fail()` bypassed the seam outcome · resolved

`SeamOutcome` covered *throws*. A seam that classified without throwing —
`host.fail(stage, e); return normally;` — still returned `SEAM_COMMITTED`, so
every continuation D-23 forbids ran anyway.

Resolved by a kernel-private `seamFailureRequested` latch, cleared as each seam
phase opens and set by `host.fail`, making an explicit classification
indistinguishable from a throw at the driver boundary. Enqueuing a checkpoint
was never sufficient: the checkpoint is queued, and the window before it applies
is exactly what the latch closes.

### F-35 — a landing-create failure still finalized the original settlement · resolved

An arm-time `anchorTarget` or `start` throw was classified, rolled the landing
hold back, and continued the settlement. With readiness also open the hold count
reached zero and the **accepted** settlement finalized — calling `onFinish` —
before the queued failure checkpoint ran.

Resolved by `ArmOutcome` (`ARM_ARMED` / `ARM_STALE` / `ARM_FAILED`).
`ARM_FAILED` suppresses `advanceSettlement` and every terminal callback for the
replaced settlement. A once-only completion latch on the attempt makes the
synchronous `fail()` case work too: it sets `failed` before `start` returns, so
the returned handle is destroyed and never published.

### F-36 — `destroy()` was not total across a throwing frame reset · resolved

Teardown wrapped attempts and `spec.retire()` but called `spec.resetFramePart`
twice unwrapped. A throw on the first frame could skip the second scrub and the
ingress abort, leaving `destroy()` non-terminal against I-6.

Each scrub is now individually best-effort and ingress abort runs from a
`finally`. The reset error is reported and never substitutes for the initiating
destroy or panic error. The same rule applies to the `arm()` unwind.

### F-37 — the terminal callback used a binary outcome predicate · resolved

`finalized` sent `OUTCOME_ACCEPTED` to `onFinish` and *everything else* to
`onCancel` — so the no-op result that D-24 exists to distinguish went to
`onCancel`, reintroducing the exact semantic error at the terminal boundary.

Replaced with an exhaustive switch on the domain result's discriminant.
Accepted and no-op finish; rejected and canceled cancel; failed produces no
domain result and never reaches `finalized`.

### F-38 — the arm path could call `start` after a synchronous destroy · resolved

Revalidation existed *after* `LandingStart` returned but not after the
`anchorTarget` immediately before it. `anchorTarget` is behavior code and can
synchronously `destroy()` the controller, after which the kernel called the
consumer's runner anyway — violating I-6's "no callback fires afterwards".
Destroying the returned handle later does not un-call it.

Resolved by revalidating on both sides of `start`.

### F-39 — the final pointerup sample was rendered only in the trace · resolved

The trace rendered the lift at the committed release point; the normative seam
table, the release pseudocode and the reference behavior moved only the
placeholder. Since `pointerup` need not share coordinates with the last
processed `pointermove`, following the seam table would compute the proposal
from the final point while the visual and the landing trajectory started from a
stale one.

The final render is now part of normative `release.effect`, classified
`FAILURE_RENDERER_WRITE`.

### F-40 — `moved()` had no failure policy · resolved

`moved` is not a transition and had no wrapper, so a `composeXY`, CSSOM or
`schedule` throw escaped the handler and became a **panic** that destroyed the
controller — contradicting the existence of `FAILURE_RENDERER_WRITE` and
`FAILURE_SCHEDULED_FRAME`, and diverging from the shipped implementation.

The kernel now wraps it (`FAILURE_RENDERER_WRITE`). Rendering and scheduling
stay one callback with two stages, narrowed from the inside via
`host.fail(FAILURE_SCHEDULED_FRAME, …)`, because splitting them would add an
indirect call to the one path that counts them — and the failure latch makes the
narrowing visible to the driver.

### F-41 — the public proposal and result types regressed · resolved

The fixture had reduced the proposal to `{ from, to }` and aliased both result
types to one numeric record, dropping probe 1's identity neighbours, proposal
version and cancellation detail — and exposing an outcome constant the export
table declared internal.

Restored as narrowed unions with string discriminants, and `CancelStage`
(`AT_PROPOSAL` / `AT_CONSUMER`) is public.

### F-42 — the feature-authoring boundary was internally contradictory · resolved

`SortableFeature` was declared public and stable while being *defined* as a
function between two types declared internal and unstable, so any change to
either changed the public type's assignability and emitted declaration.

Resolved by making the feature value **opaque** (an unexported `unique symbol`
brand). Nameable and passable, not constructible — so the closed world is real
rather than aspirational, and the authoring types are genuinely internal. The
same leakage in `DragErrorContext` and `LandingContext` was resolved the other
way, by exporting `FailureStage` and `DOMRealm`, which consumers legitimately
need.

### F-26 — the tree-shaking criterion named an impossible minimal build · corrected

`vertical()` is required, and the criterion demanded "axis geometry" be absent
from the minimal build. A minimal *vertical* sortable necessarily contains
vertical axis geometry.

Corrected in §[03](03-feature-composition.md) §Tree-shaking: the minimal fixture
is written out exactly, and what must be absent is *unselected* geometry
(horizontal, grid), free drag, landing and layout animation — which is what the
brief actually asks for (`brief.md:615-637`). The subpath/export table and the
`files.json` consequence are now written down too, because the shipped package
exposes only `draggable`/`sortable` entries and a new topology cannot be
measured before it is specified.

## Resolved and retired questions

| Q | Question | Answer |
| --- | --- | --- |
| Q-2 | Is `Omit<F, keyof KernelFrame> & Readonly<KernelFrame>` worth its type-check cost? | **Yes — reopened and answered.** An earlier answer called it moot because part separation made a direct intersection possible. It is not moot: a plain intersection leaves a colliding mutable `phase` in `Part` writable through the draft. The `Omit` is back, over a seven-key union at two seam signatures. |
| Q-3 | Does `settlement.prepare` need the resolution status as a separate argument? | **Superseded.** The separate `status: number` argument is gone; the input is one discriminated `SettlementInput` of five cases. The distinction it existed to preserve — fulfilled-`undefined` versus rejected-`undefined` — is now carried by the discriminant itself. |
| Q-5 | Should `ActivationScope` expose live `Lifetime` objects? | **No — reversed.** The earlier answer rejected a narrowed scope because a façade "costs an object per lifetime per operation". That was wrong: `Readonly<Pick<Lifetime, 'signal' \| 'use' \| 'useWhile'>>` is a *type-level* projection and the kernel passes the same physical object. Zero allocations, and I-11 stops depending on the behavior choosing not to call `dispose()`. |
| Q-8 | Does the two-phase handshake survive a behavior whose controller needs the spec? | **Yes.** Controller methods dispatch actions; none needs to invoke a seam directly, and one that did would be doing something the queue exists to prevent. |
| Q-9 | Is an injected placeholder safe inside a React-reconciled container? | **Yes, physically.** The probe disproved F-14. The residual problem was semantic (F-15) and is resolved by D-16. |
| Q-10 | Does fail-before-commit justify keeping `setPointerCapture` in `prepare`? | **Moot.** D-17 makes capture kernel-owned on `root`, so it is not in `prepare` at all. No semantic reason was found requiring a behavior-chosen capture target. |
| Q-11 | Should the reserved frame-part extension point ship unimplemented? | **The mechanism is documented; the prepare-phase seam it would need is not specified and not built.** D-10. |
| Q-1 | Should `admit` throwing become a classified failure? | **No — it becomes a *controller-level* report.** Admission runs before operation identity is minted, so there is no operation for a failure checkpoint to settle and no `REPORTING` phase to enter; minting one purely to report would invent an operation that never existed. The kernel catches the throw, leaves the controller idle and usable, and reports through `onError` with `FAILURE_ADMISSION` and no operation. This keeps the shipped package's observable outcome (idle, usable controller) while adding the diagnostic, and it names the owner — "a queued classified failure while the controller stays idle" had no owner and was not implementable (review 6, §17). |

## Open before implementation

Ordered by how much each could still move the design. **Q-1 is now answered**
(see the resolved table above).

**Q-12. What happens when a consumer breaks I-25?**
**The mechanism is normative; only its sufficiency is open.** A consumer that
unmounts or re-keys the dragged item as part of applying the reorder leaves
`anchorTarget` with no anchor. The specified behavior is the connectivity- and
parentage-guarded re-anchor (§[03](03-feature-composition.md) §`placeholder()`):
if the guard fails, measure the still-connected placeholder where it stands, pin
to that, release presentation — degraded but not stranded, and no crash. Without
that guard, `item.before(placeholder)` on a detached item would move the
placeholder into the detached tree and destroy the fallback target.

What stays open is whether the fallback is *good enough*: the alternative is
cancelling the settlement outright. The fallback is chosen because a consumer in
this state has no meaningful landing target either way, but no fixture has
exercised it.

**Q-4. Does the two-behavior-tag count survive?**
Inherited from probe 1's Q-6, and still a design assertion rather than a
measurement. Two tags: coalesced spatial frame, collection replacement. A third
or fourth is a **signal worth investigating**, not proof the boundary is
misplaced — the earlier phrasing was too absolute. The concrete known pressure
is keyboard sorting, which needs a kernel *lifecycle* transition rather than
another action tag; the recorded position is that keyboard revises the kernel
contract (§[02](02-kernel-behavior-contract.md) §`ActionTransition`).

**Q-6. Is `RECOVERY_HOME` right for a rejected reorder?**
Inherited from probe 1's Q-3, now behavior-owned rather than kernel-owned, which
makes it cheaper to change. Returning the visual to its grab origin is what
ships, but with a placeholder-based sortable the home slot may have moved under
an accepted concurrent update. The test matrix should include a rejection after
a collection change.

**Q-7. How is the layout-displacement feature's element set determined?**
Inherited from probe 1's Q-4. Every item in the destination view, or only those
between the old and new gap? The second is cheaper and expected; the correct set
under a concurrent collection replacement is not obvious.

**Blocking before implementation sign-off**, because it is entangled with a
duplicate-work problem: `vertical()` rebuilds its rect index around the same
committed placeholder move that `layoutAnimation()` brackets with its own
before/after measurements, so one move can force two full-list layout reads. For
a large list those reads plausibly dominate everything else this contract
counts. Measure the minimal affected set; if both features need the same pre-move
rects, introduce a behavior-owned read phase or a small shared geometry-read
capability rather than duplicating measurement to preserve conceptual privacy.

## Measurements owed before implementation sign-off

Not open design questions — open *numbers*. Each replaces a claim currently
resting on intuition.

| # | Measure | Replaces |
| --- | --- | --- |
| M-1 | End-to-end browser trace of the move path: generic 15-field `Object.assign` vs a specialized kernel pointer-publication path vs the shipped runtime. Include multiple behavior frame shapes — JIT feedback may be shared across controller closures even when each controller sees one shape. | "Removing the copy would be performance theatre" (F-24) |
| M-2 | Heap and move-call behaviour at realistic controller counts: closure model vs opaque-`S`-plus-static-spec. **And**, independently, **three** frame-task policies — eager-retained (current), **lazy-retained** (create on first activation, keep on the controller, cancel and reuse afterwards) and per-operation (shipped) — measured on heap for many cold controllers, heap for active controllers, first-drag latency, repeated-drag allocation and retention, and call-site shape. | F-4's "expected to be irrelevant", and the eager frame-task policy |
| M-3 | Four consumer entrypoints built and weighed minified + Brotli, with module-graph inspection, plus a feature-matched non-composed baseline **and** the current shipped `sortable.js` as a separate migration-context baseline. | §[03](03-feature-composition.md) §Tree-shaking's import-graph reasoning |
| M-4 | Minimal displacement element set, and whether the two features' layout reads can share one pass. | Q-7 |

M-3 needs real fixtures: `packages/drag/.size-limit.json` currently weighs only
the built `draggable`/`sortable` entries and their combination, which cannot
distinguish a minimal composition from the complete one. Add budgets only after
the first measurement.

**Lazy-retained is a real candidate, not a formality.** It pays nothing for
controllers that never activate — which eager-retained does — and it does not
reallocate per drag, which per-operation does. Its only costs are a nullable
field with an initialization branch and slightly different runtime typing. A
binary eager-vs-per-operation benchmark could easily select a dominated policy.

**M-1, M-2 and M-4 owe the same reproducibility standard as M-3.** Each needs a
checked-in workload and harness; named browser engines and versions; a warm-up
and GC policy; the controller and list counts under test; a sampling and
statistical policy; and, for M-1 specifically, a correctness-equivalence check
for any specialized pointer path against the generic one. M-4 additionally needs
representative collection-mutation and layout cases, not a static list. Until
those exist these are good questions, not sign-off gates.

**M-3 is not reproducible until these are checked in**, so they are part of the
measurement, not of its write-up: the exact import statement of each fixture;
the frozen runtime and type export map (§[03](03-feature-composition.md) §The
export topology this requires); bundler, target, minifier and alias
configuration; the minified and compressed reporting method; the
repetition/noise policy; and module-graph assertions naming each optional module
that must be **absent**.

Report the two baselines separately and do not substitute one for the other. The
shipped `sortable.js` is not feature-equivalent to the proposed minimal
composition — the feature-matched non-composed build answers *what does
composition cost*, while the shipped entry answers *what does migrating cost*.

## Test matrix

Groups marked **new** exist only because of this construction model or the React
probe findings.

**Basic flow** · press below threshold · activation after threshold · placeholder
insertion · continuous pointer following · downward reorder · upward reorder ·
release at the current insertion · no-op release · immediate landing.

**Boundary** · no oscillation at an insertion threshold · rapid alternating
samples preserve FIFO · release uses the final synchronous geometry · pending
frame work cannot alter the released proposal.

**Readiness** · consumer accepts but readiness is delayed · landing before React ·
React before landing · both immediate · stale readiness from an older operation ·
readiness never settles and the timeout applies · readiness resolved from a real
`useLayoutEffect()` fixture.

**Reentrancy** · **`onStart` cancels → the operation settles as canceled at
`AT_PROPOSAL` with a null proposal, and never reaches `ACTIVE` (I-31)** ·
`onStart` destroys · **`onReorder` cancels
→ the cancel wins** and the later resolution is stale (F-25) · `onReorder`
destroys · a callback queues work and then throws · a terminal callback
destroys.

**Async attempts** · late reorder resolution after a newer operation · late
landing completion · interrupted landing · stale layout-animation completion.

**Resource cleanup** · partial activation failure · placeholder factory throws ·
presentation acquisition throws · animation creation throws · destroy during
active movement · destroy during consumer resolution · destroy during long
landing · disposer failure does not prevent remaining cleanup.

**Collection** · update during active movement · dragged item disappears ·
neighbour identity changes · update during release · update during settlement.

**Styling and animation** · no-animation default · CSS layout transition · long
landing duration · custom animation runner · interrupted and retargeted
displacement.

**Construction model — new** · a discarded `activation.prepare` leaves nothing
behind **and retires the operation** · a reentrant `destroy()` from the
placeholder factory discards the prepare · `spec.retire()` throwing does not
prevent lifetime disposal or ingress abort (F-12) · one throwing feature retire
hook does not prevent the rest, and hooks run in reverse installation order
(F-22) · a feature factory throwing mid-`assemble` unwinds the hooks already
collected (F-19) · `arm()` throwing leaves no half-armed controller · both frames
share a key set (F-2) · a `resetFramePart` that adds or deletes a key is caught
in `__DEV__` · a frame part declaring `phase` is rejected in production
(F-20/§7) · a symbol-keyed frame part is rejected · a displacement hook cannot
reach `SettlementScope` (I-10) · `arm()` validates the declared action-tag
count, while `dispatch()` rejects an actual negative, fractional or out-of-range
tag before enqueue.

**Gates and drivers — new** · a behavior with **no** `landing()` but a pending
readiness promise still holds one gate and does **not** finalize in the
resolution drain (I-9) · a behavior with neither gate held finalizes in the
resolution drain · a duplicate `holdForReadiness` is ignored and reported, and
does not double-count · a hold requested after sealing is ignored and reported ·
`settlement.prepare` returning a `SeamRejection` classifies at the named
stage without any preceding side call (F-20) · an `effect` that throws is
classified, not a panic (F-19) · a `rollback` that throws is reported, not
classified · `use()` on a disposed lifetime invokes the disposer immediately.

**Landing completion — new** · synchronous `done()` from inside `start` ·
synchronous `fail()` from inside `start` · duplicate completion is inert ·
`done()` followed by a throw · `start` itself throws → hold rolled back,
`FAILURE_LANDING_CREATE`, `ARM_FAILED`, no `advanceSettlement()` and no terminal
callback from the replaced settlement · **`start` calls `destroy()` and then returns a
live handle → the handle is destroyed exactly once and never published (F-30)** ·
`settlement.effect` requests one hold then throws → no watch and no runner start
(F-27) · a
returned handle whose `destroy()` throws → reported, pin still happens,
presentation still released (F-22) · the final `lift.write` throws →
`FAILURE_RENDERER_WRITE`, presentation still released · `spec.finalized` throws →
`FAILURE_TERMINAL_CALLBACK`, operation still retires.

**Collection staging — new** · a reentrant `cancel()` during
`action.prepare(COLLECTION)` leaves `rt.snapshot` unchanged (F-19/§4) · a
discarded collection action is not observable by a later queued action · a
collection replacement at `SETTLING` publishes in `effect`, not `prepare` ·
**an invalidating replacement publishes the new snapshot AND then cancels — the
update is never lost (F-28)** · a replacement at `IDLE` publishes but leaves no
item elements in either frame (I-20) · a replacement at `RELEASING`/`SETTLING`
does not rewrite the operation's frozen snapshot · **`onStart` calls
`updateItems()` → the action is applied at `ACTIVATING`, before
`START_COMMITTED`, not deferred (F-32)**.

**Failure continuation — new** · `activation.prepare` throws → exactly one
`onError`, and retirement happens *after* failure handling, not instead of it
(F-27) · `release.effect` throws → `onReorder` is **never** invoked · join
target or write failure → presentation releases, **no** `onFinish`, exactly one
`onError` · `finalized` throws → `FAILURE_TERMINAL_CALLBACK`, still retires ·
an admission resolver calls `destroy()` → no operation is minted (F-30).

**Settlement mapping — new** · a skipped resolution → `OUTCOME_NOOP`, immediate
recovery, `onFinish` — never rejected/home (F-29) · a rejected resolution
*promise* → `FAILURE_REORDER_RESOLUTION`, not `onCancel` · a fulfilled
non-resolution → `FAILURE_REORDER_RESOLUTION` · an accepted resolution →
destination recovery · a rejected `ReorderResolution` value → home recovery and
`onCancel`.

**Placeholder movement — new** · move to a **start** gap (`before === null`) ·
move to an **end** gap (`after === null`) · `homeInsertion` carries the item's
real neighbours (F-31) · release and the spatial action produce identical
placement for the same insertion.

**Terminal protocol — new** · a kernel `CANCEL` produces a complete canceled
result — outcome, home recovery, reason, `AT_PROPOSAL`/`AT_CONSUMER` stage — and
`onCancel` receives it (F-33) · a failure checkpoint produces immediate recovery
and **no** `finalized` call · a no-op settlement calls `onFinish`, never
`onCancel` (F-37) · a rejected `ReorderResolution` value calls `onCancel` with a
reason · a rejected resolution *promise* is `FAILURE_REORDER_RESOLUTION`, not
`onCancel` · public finish/cancel results narrow without importing an internal
constant, and carry version, from/to and identity neighbours (F-41).

**Explicit failure latching — new** · each seam in turn calls `host.fail` and
returns **normally** → no success continuation: activation queues no
`START_COMMITTED`, release never invokes `onReorder`, settlement arms no gate,
an action's transition does not proceed (F-34) · arm-time `anchorTarget` throws
→ the original settlement never finalizes and `onFinish` is never called
(F-35) · `LandingStart` calls `fail()` synchronously and returns a live handle →
the handle is destroyed once and never published · `LandingStart` calls `fail()`
then `done()`, and `done()` then `fail()` → first completion wins in both
orders · `anchorTarget` destroys the controller before `start` → `start` is
**never called** (F-38) · `moved` throws from compose, from the style write, and
from `schedule` → classified, never a panic (F-40).

**Teardown totality — new** · `resetFramePart(current)` throws → the draft is
still scrubbed and ingress is still aborted (F-36) · `resetFramePart(draft)`
throws → ingress is still aborted · a reset throw during a failed `arm()` unwind
does not replace the original arm error · the reset error is reported, never
substituted for the initiating destroy error.

**Placeholder and admission — new** · an already-correct start, internal and end
gap each perform **no** DOM reinsert and leave geometry valid · release at the
incumbent insertion performs no reinsert · a shadow-DOM press resolves the
semantic item from the snapshot along the composed path, not `event.target` ·
a handle resolver narrows admission without replacing the item (F-42 sibling) ·
an iframe-hosted root uses its own `defaultView` · pointerup at coordinates
newer than the last move renders the final sample (F-39) · a duplicate axis
feature cleans the rejected contribution's private state · an `updateItems()`
from `onStart` that invalidates the gap → `START_COMMITTED` observes the
synchronous cancel latch and does not activate, and the cancellation queued
behind it **settles at `ACTIVATING`** rather than being abandoned (I-31).

**Teardown robustness — new** · a landing handle whose `destroy()` throws during
`controller.destroy()` → lifetimes, frame task, ingress and queue are still
released · the same during the normal join → presentation still released, and
I-24 is **not** claimed for that operation (§8) · an own `__proto__` frame-part
key is rejected · the **second** frame factory result returns a colliding key →
rejected at `arm()`.

**Failure paths — new** · `anchorTarget` throws at readiness → landing continues,
settlement unchanged, join still pins (F-17) · `retarget()` throws → runner is
not destroyed, no hold changes, join still pins (F-17) · `anchorTarget` throws at
the join → `FAILURE_LANDING_TARGET`, pin skipped, presentation still released ·
`activation.effect` throws after the placeholder is inserted → the placeholder is
still removed (F-18) · `onStart` destroys → every activation resource is already
owned.

**Landing target — new** · authored commit inserts content above the placeholder
during landing (F-13) · authored commit inserts a **new keyed item** into the
destination gap (F-15) · the re-anchor is inert when the placeholder is already
adjacent · landing completes before readiness · readiness completes before
landing · both orders produce the same pinned target · **no readiness supplied →
`authoredReady` is true from sealing, so the arm-time measurement DOES re-anchor
for a destination recovery** · readiness times out → **no** re-anchor · recovery
is home or immediate → **no** re-anchor whatever `authoredReady` says · a runner
without
`retarget()` still pins correctly · `anchorTarget` throws at the join →
presentation is still released · the dragged item is unmounted by the authored
commit (Q-12).
