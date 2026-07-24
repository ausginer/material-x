# Artifact 1 — Per-feature phase/action tables

Source of truth: `packages/drag/src/draggable/machine/*` and `packages/drag/src/sortable/machine/*` at commit `1ce3003d`.

Each row is one **accepted** (state, event) pair. Any pair not listed returns `ignored(state)` — same state, no effects. That default is itself part of the contract: stale and out-of-phase input is silently dropped, never an error.

Notation: `op` = the current operation record, `cfg` = machine config (frozen consumer callbacks + `threshold` + `hasHomeTarget`).

> **Interpretation rule.** These tables describe the accepted semantics of the current implementation. They do **not** prescribe the target number of phases, actions, checkpoints, modules, or helper functions. The new runtime may merge rows and phases freely when guards, ordering, callbacks, cleanup and observable outcomes remain equivalent, except for the explicit decisions in artifact 8.

---

# 1. Draggable

## 1.1 Phase constants

| Phase | Value | Meaning |
| --- | --: | --- |
| `DRAG_IDLE` | 200 | No operation. The only phase that admits a press. |
| `DRAG_PENDING_ARMING` | 201 | Admitted; session listeners not yet confirmed armed. |
| `DRAG_PENDING` | 202 | Armed; below activation threshold. |
| `DRAG_ACQUIRING` | 203 | Threshold crossed; acquiring lift/renderer/origin rect. |
| `DRAG_STARTING` | 204 | Activation acquired; `onStart` in flight. |
| `DRAGGING` | 205 | Active free drag. |
| `DRAG_RESOLVING_RELEASE` | 206 | Pointer released; computing final geometry + proposal. |
| `DRAG_AWAITING_CONSUMER` | 207 | `onDrop` in flight (sync or async). |
| `DRAG_SETTLING` | 208 | Awaiting three gates: interaction stopped, landing, readiness. |
| `DRAG_REPORTING_FAILURE` | 209 | `onError` in flight; holds the continuation. |
| `DRAG_FINALIZING` | 210 | Presentation released; `onFinish`/`onCancel` in flight. |

`nextOperationId` starts at 1 and increments per admitted press. `policy` is carried across all phases in `DraggableStateCore`.

## 1.2 Global pre-switch rule

`POLICY_UPDATED` is handled in `createDraggableMachine` **before** the phase switch and therefore applies in every phase, terminal ones included.

| Guard | Draft mutation          | Commit | Effects | Next phase |
| ----- | ----------------------- | ------ | ------- | ---------- |
| none  | `policy = event.policy` | yes    | none    | unchanged  |

See [D-4](08-compatibility-ledger.md#d-4).

## 1.3 `DRAG_IDLE`

| Event | Guard | Draft mutation | Effects | Next phase |
| --- | --- | --- | --- | --- |
| `ADMIT_POINTER` | none | allocate `op` with `operationId = nextOperationId`, `originPointer = latestPointer = event.point`, `nextMotionId/ResolutionId/LandingId = 1`; `nextOperationId += 1` | `BEGIN_POINTER_OPERATION{operationId, pointerId}` | `DRAG_PENDING_ARMING` |

Exit invariant: exactly one `op` exists; no resources are held yet — they are acquired by the effect.

## 1.4 `DRAG_PENDING_ARMING` / `DRAG_PENDING`

| Event | Guard | Draft mutation | Effects | Next phase |
| --- | --- | --- | --- | --- |
| `OPERATION_ARMED` | phase is `ARMING` ∧ same op | none | none | `DRAG_PENDING` |
| `OPERATION_ARM_FAILED` | same op | → reporting, cause `FAILURE_ACTIVATION`, continuation `IDLE` | `REPORT_FAILURE` | `DRAG_REPORTING_FAILURE` |
| `POINTER_RELEASED` | `pointerId === op.pointerId` | none | `DISARM_OPERATION` | `DRAG_IDLE` |
| `OPERATION_CANCELED` | none | none | `DISARM_OPERATION` | `DRAG_IDLE` |
| `POINTER_MOVED` | `pointerId === op.pointerId` ∧ phase is `PENDING` ∧ `crossed(origin, point, threshold)` | `op.latestPointer = event.point` | `ACQUIRE_FREE_ACTIVATION{pointerId, originPointer, latestPointer, coordinateSpace}` | `DRAG_ACQUIRING` |
| `POINTER_MOVED` | same pointer, below threshold **or** phase is `ARMING` | none | none | unchanged (ignored) |

Note: a sub-threshold move in `DRAG_PENDING` does **not** update `op.latestPointer`. Only the threshold-crossing move does. Activation therefore uses the crossing point, not the last sub-threshold point.

`crossed` is Chebyshev, not Euclidean: `|dx| ≥ t ∨ |dy| ≥ t`.

## 1.5 `DRAG_ACQUIRING`

| Event | Guard | Draft mutation | Effects | Next phase |
| --- | --- | --- | --- | --- |
| `ACTIVATION_READY` | same op | promote to `ActiveOperation`: merge `candidate{originRect, coordinateSpace}`, compute `viewportDelta = pointerDelta(latest, origin, originRect, policy.axis, null)` | `INVOKE_START{geometry, callback: cfg.onStart}` | `DRAG_STARTING` |
| `ACTIVATION_FAILED` | same op | → reporting, `FAILURE_ACTIVATION`, continuation `IDLE` | `REPORT_FAILURE` | `DRAG_REPORTING_FAILURE` |
| `OPERATION_CANCELED` | none | none | `DISARM_OPERATION` | `DRAG_IDLE` |

Cancel here is a clean abandon — no settlement, no `onCancel`. The operation never became active, so no terminal callback is owed.

## 1.6 `DRAG_STARTING`

| Event | Guard | Draft mutation | Effects | Next phase |
| --- | --- | --- | --- | --- |
| `START_SUCCEEDED` | same op | `pendingMotion = null` | `PRESENT_MOTION{motionId: 0, viewportDelta}` | `DRAGGING` |
| `START_FAILED` | same op | → reporting, `FAILURE_ACTIVATION`, continuation `IDLE` | `REPORT_FAILURE` | `DRAG_REPORTING_FAILURE` |
| `OPERATION_CANCELED` | none | settlement: `OUTCOME_CANCELED`, recovery `HOME` if `cfg.hasHomeTarget` else `IMMEDIATE`, presentation `TERMINAL` | `STOP_INTERACTION` [+ `PREPARE_FREE_LANDING`] | `DRAG_SETTLING` |

This is the first phase where cancel produces a settlement and therefore an `onCancel`, because presentation resources are now held.

`motionId: 0` on the initial present is deliberate — it can never match `nextMotionId - 1` (which is ≥ 0 only after a real motion), so a failure from the initial paint is attributed correctly.

## 1.7 `DRAGGING`

| Event | Guard | Draft mutation | Effects | Next phase |
| --- | --- | --- | --- | --- |
| `POINTER_MOVED` | `pointerId === op.pointerId` | `op.nextMotionId += 1`; `pendingMotion = {currency, point, refresh: false, axis, coordinateSpace, callback}` snapshotted from `policy` | `OBSERVE_FREE_MOTION{bounds, boundsVersion, refresh: false}` | `DRAGGING` |
| `INVALIDATED` | none | as above but `point = op.latestPointer`, `refresh: true` | `OBSERVE_FREE_MOTION{refresh: true}` | `DRAGGING` |
| `CONTROLLED_POSITION` | none | as above, `refresh: false` | `OBSERVE_CONTROLLED_POSITION{position, originRect, coordinateSpace}` | `DRAGGING` |
| `MOTION_OBSERVED` | `pendingMotion` ∧ matching `motionId` ∧ same op | `latestPointer = pendingMotion.point`; `viewportDelta = pointerDelta(point, origin, originRect, pendingMotion.axis, event.bounds)`; `pendingMotion = null` | `PRESENT_MOTION` [+ `INVOKE_MOVE` if `pendingMotion.callback`] | `DRAGGING` |
| `CONTROLLED_POSITION_RESOLVED` | as above | `viewportDelta = event.viewportDelta`; `pendingMotion = null` | same | `DRAGGING` |
| `MOTION_OBSERVATION_FAILED` / `CONTROLLED_POSITION_FAILED` | matching pending motion | → reporting, `FAILURE_MOVE`, continuation `failedSettlement` | `REPORT_FAILURE` | `DRAG_REPORTING_FAILURE` |
| `MOTION_PRESENTATION_FAILED` | `motionId === op.nextMotionId - 1` ∧ same op | → reporting, `FAILURE_RENDERER_WRITE`, continuation `failedSettlement` | `REPORT_FAILURE` | `DRAG_REPORTING_FAILURE` |
| `MOVE_CALLBACK_FAILED` | as above | → reporting, `FAILURE_MOVE`, continuation `failedSettlement` | `REPORT_FAILURE` | `DRAG_REPORTING_FAILURE` |
| `POINTER_RELEASED` | `pointerId === op.pointerId` | `op.nextMotionId += 1` | `RESOLVE_FREE_RELEASE{item, visual, point, originPointer, originRect, coordinateSpace, axis, bounds, boundsVersion}` | `DRAG_RESOLVING_RELEASE` |
| `OPERATION_CANCELED` | none | settlement `OUTCOME_CANCELED`, recovery `HOME`/`IMMEDIATE`, presentation `TERMINAL` | `STOP_INTERACTION` [+ `PREPARE_FREE_LANDING`] | `DRAG_SETTLING` |

**Coalescing:** there is exactly one `pendingMotion` slot. A second `POINTER_MOVED` arriving before the first observation resolves overwrites the slot and bumps `motionId`, so the earlier observation result fails its guard and is dropped. This is latest-wins **for the observation round-trip only** — every move is still individually queued and individually decided.

**Policy snapshot:** `axis`, `coordinateSpace` and `onMove` are copied into `pendingMotion` at dispatch time, so a `POLICY_UPDATED` landing mid-round-trip does not retroactively change the in-flight motion. `bounds`/`boundsVersion` are read from live policy at effect-emit time.

## 1.8 `DRAG_RESOLVING_RELEASE`

| Event | Guard | Draft mutation | Effects | Next phase |
| --- | --- | --- | --- | --- |
| `RELEASE_RESOLVED` | same op ∧ `motionId === currency.motionId` | `latestPointer = lifecycle.point`; `viewportDelta = event.viewportDelta`; `nextResolutionId += 1` | `[PRESENT_MOTION, OPEN_DROP_RESOLUTION{request, callback: cfg.onDrop}]` | `DRAG_AWAITING_CONSUMER` |
| `RELEASE_FAILED` | as above | → reporting, `FAILURE_MOVE`, continuation `failedSettlement` | `REPORT_FAILURE` | `DRAG_REPORTING_FAILURE` |
| `OPERATION_CANCELED` | none | settlement `OUTCOME_CANCELED` | `STOP_INTERACTION` [+ landing] | `DRAG_SETTLING` |

Interaction is **still armed** here. See [D-1](08-compatibility-ledger.md#d-1).

## 1.9 `DRAG_AWAITING_CONSUMER`

| Event | Guard | Draft mutation | Effects | Next phase |
| --- | --- | --- | --- | --- |
| `DROP_RESOLVED` | matching `operationId` + `resolutionId` | build `domain` (`ACCEPTED{proposal}` or `REJECTED{proposal, reason}`); presentation gate = `WATCHING{currency}` if `presentationReady` else `TERMINAL`; recovery = `IMMEDIATE` if accepted ∨ `!hasHomeTarget`, else `HOME` | `STOP_INTERACTION` [+ `WATCH_PRESENTATION`] [+ `PREPARE_FREE_LANDING`] | `DRAG_SETTLING` |
| `DROP_RESOLUTION_FAILED` | as above | → reporting, `FAILURE_DROP_RESOLUTION`, continuation `failedSettlement` | `REPORT_FAILURE` | `DRAG_REPORTING_FAILURE` |
| `MOTION_PRESENTATION_FAILED` | same op ∧ `motionId === nextMotionId - 1` | → reporting, `FAILURE_RENDERER_WRITE`, continuation `failedSettlement` | `REPORT_FAILURE` | `DRAG_REPORTING_FAILURE` |
| `OPERATION_CANCELED` | none | settlement `OUTCOME_CANCELED`, presentation `TERMINAL` | `STOP_INTERACTION` [+ landing] | `DRAG_SETTLING` |

**A rejected drop with a home target lands home; an accepted drop never lands.** Cancel here discards any `presentationReady` the consumer would have supplied.

## 1.10 `DRAG_SETTLING`

Three independent gates must all be terminal before finalization: `interactionStopped ∧ landingTerminal ∧ presentationTerminal` (`settlementReady`, `helpers.ts`).

| Event | Guard | Draft mutation | Effects | Next phase |
| --- | --- | --- | --- | --- |
| `INTERACTION_STOPPED` | same op | `interactionStopped = true` | via `advanceSettlement` | `DRAG_SETTLING` or `DRAG_FINALIZING` |
| `PRESENTATION_SETTLED` (`error === null`) | gate `WATCHING` ∧ matching resolution currency | presentation → `TERMINAL` | via `advanceSettlement` | ↑ |
| `PRESENTATION_SETTLED` (`error !== null`) | as above | replacement settlement — see [artifact 6](06-presentation-readiness.md) | `REPORT_FAILURE` | `DRAG_REPORTING_FAILURE` |
| `LANDING_PLAN_RESOLVED` | gate `PREPARING` ∧ matching landing currency | landing → `STARTING{plan}` | `START_LANDING{plan, timing: policy.landingTiming}` | `DRAG_SETTLING` |
| `LANDING_STARTED` | gate `STARTING` ∧ match | landing → `RUNNING` | none | `DRAG_SETTLING` |
| `LANDING_FINISHED` | gate `RUNNING` ∧ match | landing → `COMPLETING` | `PIN_LANDING` | `DRAG_SETTLING` |
| `LANDING_PINNED` | gate `COMPLETING` ∧ match | landing → `TERMINAL` | via `advanceSettlement` | ↑ |
| `LANDING_PLAN_FAILED` \| `LANDING_TIMING_FAILED` \| `LANDING_ANIMATION_FAILED` \| `LANDING_FAILED` \| `LANDING_PIN_FAILED` | landing has a currency ∧ match | continuation: outcome `OUTCOME_FAILED` keeping `domain`, recovery `IMMEDIATE`, both gates terminal, `interactionStopped` preserved | `REPORT_FAILURE` | `DRAG_REPORTING_FAILURE` |

Landing failure cause mapping: plan → `FAILURE_HOME_TARGET`, timing → `FAILURE_LANDING_TIMING`, animation create → `FAILURE_ANIMATION_CREATE`, pin → `FAILURE_LANDING_PIN`, interrupted → `FAILURE_LANDING_INTERRUPTED`.

`OPERATION_CANCELED` is **not** accepted in `DRAG_SETTLING`. A settling operation cannot be cancelled.

## 1.11 `DRAG_REPORTING_FAILURE`

| Event | Guard | Behaviour |
| --- | --- | --- |
| `FAILURE_REPORTED` | same op | If `continuation.phase === DRAG_IDLE`: commit idle, emit `RETIRE_OPERATION`. Otherwise re-enter the settling continuation: emit `STOP_INTERACTION` if not already stopped, emit `PREPARE_FREE_LANDING` if the continuation's landing is `PREPARING` and a home resolver exists, then `advanceSettlement`. |

If `advanceSettlement` produces effects (i.e. the continuation is already ready), those win and the re-entry effects are dropped — see `reporting.ts:67`.

## 1.12 `DRAG_FINALIZING`

| Event | Guard | Effects | Next phase |
| --- | --- | --- | --- |
| `FINALIZATION_COMPLETED` | same op | `RETIRE_OPERATION` | `DRAG_IDLE` |
| `FINALIZATION_FAILED` | same op | `REPORT_FAILURE` with `FAILURE_FINISH_CALLBACK` if terminal result is `ACCEPTED`, else `FAILURE_CANCEL_CALLBACK`; continuation `IDLE` | `DRAG_REPORTING_FAILURE` |

Terminal-callback selection (`advanceSettlement`): result `OUTCOME_FAILED` → no callback; domain `CANCELED` or `REJECTED` → `onCancel(domain)`; any other domain → `onFinish(domain)`; `domain === null` → no callback.

---

# 2. Sortable

## 2.1 Phase constants

| Phase | Value | Meaning |
| --- | --: | --- |
| `SORTABLE_IDLE` | 300 | No operation. |
| `SORTABLE_PENDING` | 301 | Admitted (pointer or keyboard); awaiting arm/threshold. |
| `SORTABLE_ACTIVATING` | 302 | `stage: 'acquiring' \| 'starting'`. |
| `SORTABLE_ACTIVE` | 303 | Active pointer drag with coalesced spatial work. |
| `SORTABLE_SPATIAL` | 304 | Stabilizing the final insertion for a proposal. |
| `SORTABLE_RESOLVING` | 305 | `onReorder` in flight. |
| `SORTABLE_SETTLING` | 306 | Three gates, as draggable. |
| `SORTABLE_REPORTING` | 307 | `onError` in flight. |
| `SORTABLE_FINALIZING` | 308 | `onFinish`/`onCancel` in flight. |

Sortable has no `policy` field — options are frozen into `cfg` at construction. `updateItems` flows through the collection, not a policy event.

## 2.2 `SORTABLE_IDLE`

| Event | Draft mutation | Effects | Next phase |
| --- | --- | --- | --- |
| `ADMIT_POINTER` | `op` with `input = {POINTER, pointerId}`, `insertion = null`, snapshot from admission | `BEGIN_POINTER_OPERATION` | `SORTABLE_PENDING` |
| `ADMIT_KEYBOARD` | `op` with `input = {KEYBOARD}`, `insertion = event.insertion` (precomputed by `keyboardInsertion`) | `BEGIN_KEYBOARD_OPERATION` | `SORTABLE_PENDING` |

## 2.3 `SORTABLE_PENDING`

| Event | Guard | Effects | Next phase |
| --- | --- | --- | --- |
| `OPERATION_ARMED` | same op ∧ keyboard input | `ACQUIRE_SORTABLE_ACTIVATION` | `SORTABLE_ACTIVATING{acquiring}` |
| `POINTER_MOVED` | same op ∧ pointer match ∧ `crossed` | `ACQUIRE_SORTABLE_ACTIVATION` with `latestPoint` updated | `SORTABLE_ACTIVATING{acquiring}` |
| `POINTER_MOVED` | same op ∧ pointer match ∧ below threshold | none | `SORTABLE_PENDING`, `latestPoint` updated |
| `POINTER_RELEASED` | pointer input ∧ pointer match | `DISARM_OPERATION` | `SORTABLE_IDLE` |
| `OPERATION_CANCELED` | none | `DISARM_OPERATION` | `SORTABLE_IDLE` |
| `COLLECTION_UPDATED` | same op ∧ **item removed** | `DISARM_OPERATION` | `SORTABLE_IDLE` |
| `OPERATION_ARM_FAILED` | same op | `REPORT_FAILURE` `FAILURE_PRESENTATION_LEASE`, continuation idle | `SORTABLE_REPORTING` |

Unlike draggable, a sub-threshold move **does** update `latestPoint`. Keyboard operations activate on `OPERATION_ARMED` without any threshold.

## 2.4 `SORTABLE_ACTIVATING`

| Event | Guard | Effects | Next phase |
| --- | --- | --- | --- |
| `ACTIVATION_READY` | `stage === 'acquiring'` ∧ same op | `INVOKE_START{item, cfg.onStart}` | `ACTIVATING{starting}`, op promoted with `activationVersion`, `activationIndex`; `insertion` = `event.insertion` for pointer, **preserved** for keyboard |
| `START_SUCCEEDED` (pointer) | `stage === 'starting'` ∧ same op ∧ activated | `PRESENT_MOTION{origin, point}` | `SORTABLE_ACTIVE` |
| `START_SUCCEEDED` (keyboard) | as above | `RESOLVE_PROPOSAL_INSERTION{keyboard: true}` | `SORTABLE_SPATIAL` |
| `ACTIVATION_FAILED` \| `START_FAILED` | same op | `REPORT_FAILURE` `FAILURE_ACTIVATION`, continuation idle | `SORTABLE_REPORTING` |
| `OPERATION_CANCELED` | none | `REPORT_FAILURE` `FAILURE_ACTIVATION` with `event.reason` **as the error**, continuation idle | `SORTABLE_REPORTING` |
| `COLLECTION_UPDATED` | same op ∧ item removed | `REPORT_FAILURE` `FAILURE_ACTIVATION`, error `Error('drag: sortable item was removed during activation')` | `SORTABLE_REPORTING` |

Note the asymmetry with draggable: cancelling during sortable activation is routed through `activationFailure`, so it reaches `onError` (with a `CancellationReason` as the "error"), not `onCancel`. Recorded in [artifact 8](08-compatibility-ledger.md).

A keyboard operation goes straight to `SORTABLE_SPATIAL` — it never enters `SORTABLE_ACTIVE` and never presents motion.

## 2.5 `SORTABLE_ACTIVE`

| Event | Guard | Draft mutation | Effects | Next phase |
| --- | --- | --- | --- | --- |
| `POINTER_MOVED` | pointer input ∧ same op ∧ pointer match | `latestPoint`; `nextSpatialId += 1`; `nextMotionId += 1`; `pendingSpatial = request`; `latestMotion = motion` | `[PRESENT_MOTION, RESOLVE_ACTIVE_INSERTION{request}]` | `SORTABLE_ACTIVE` |
| `ACTIVE_INSERTION_RESOLVED` | matches `pendingSpatial` (op + collectionVersion + spatialId) | `op.insertion = event.insertion`; `pendingSpatial = null` | `PLACE_COMMITTED_INSERTION` | `SORTABLE_ACTIVE` |
| `ACTIVE_INSERTION_FAILED` | as above | → reporting `FAILURE_INVALIDATION`, continuation cancel/`RECOVERY_HOME` | `REPORT_FAILURE` | `SORTABLE_REPORTING` |
| `POINTER_RELEASED` | pointer input ∧ same op ∧ pointer match | `latestPoint = event.point`; `nextSpatialId += 1` | `RESOLVE_PROPOSAL_INSERTION{request}` | `SORTABLE_SPATIAL` |
| `ACTIVE_INSERTION_RESOLVED` (keyboard input) | keyboard op | as release, using `op.latestPoint` | `RESOLVE_PROPOSAL_INSERTION` | `SORTABLE_SPATIAL` |
| `COLLECTION_UPDATED` | same op | see [artifact 7](07-sortable-collection-matrix.md) |  |  |
| `MOTION_PRESENTATION_FAILED` | matches `latestMotion` | → reporting `FAILURE_RENDERER_WRITE`, continuation cancel/`RECOVERY_HOME` | `REPORT_FAILURE` | `SORTABLE_REPORTING` |
| `PLACEHOLDER_WRITE_FAILED` | same op | → reporting `FAILURE_PLACEHOLDER_TARGET`, continuation cancel/`RECOVERY_HOME` | `REPORT_FAILURE` | `SORTABLE_REPORTING` |
| `OPERATION_CANCELED` | none | settlement cancel, `RECOVERY_HOME` | `STOP_INTERACTION` + `PREPARE_SORTABLE_LANDING` | `SORTABLE_SETTLING` |

`pendingSpatial` is a single coalescing slot keyed by `(operationId, collectionVersion, spatialId)`. Bumping `nextSpatialId` on every move invalidates any in-flight frame result.

## 2.6 `SORTABLE_SPATIAL`

| Event | Guard | Behaviour |
| --- | --- | --- |
| `PROPOSAL_INSERTION_RESOLVED` | op + collectionVersion + spatialId match | `buildReorderProposal(op.snapshot, op.item, insertion)`. If it returns nothing → reporting `FAILURE_REORDER_RESOLUTION`. If `noop` → settlement `OUTCOME_NO_OP` with the proposal, `RECOVERY_IMMEDIATE`. Otherwise `nextResolutionId += 1` and emit `[PLACE_COMMITTED_INSERTION, OPEN_REORDER_RESOLUTION]` → `SORTABLE_RESOLVING`. |
| `PROPOSAL_INSERTION_FAILED` | as above | reporting `FAILURE_REORDER_RESOLUTION`, continuation cancel `CANCEL_CONSUMER` / `RECOVERY_IMMEDIATE` |
| `PLACEHOLDER_WRITE_FAILED` | same op | reporting `FAILURE_PLACEHOLDER_TARGET`, continuation cancel / `RECOVERY_IMMEDIATE` |
| `OPERATION_CANCELED` | none | settlement cancel, `RECOVERY_IMMEDIATE` |

A no-op reorder still produces a proposal and still calls `onFinish` — it is `OUTCOME_NO_OP`, not a cancellation.

## 2.7 `SORTABLE_RESOLVING`

| Event | Guard | Behaviour |
| --- | --- | --- |
| `REORDER_RESOLVED` | resolution currency match | domain = `ACCEPTED{proposal}` or `REJECTED{reason: REORDER_REJECTION_CONSUMER, detail, proposal}`. Recovery = `DESTINATION` if accepted else `HOME`. Presentation gate `WATCHING` if `presentationReady` else `ABSENT`. Effects: `STOP_INTERACTION` + `PREPARE_SORTABLE_LANDING` [+ `WATCH_PRESENTATION`]. → `SORTABLE_SETTLING` |
| `REORDER_RESOLUTION_FAILED` | match | reporting `FAILURE_REORDER_RESOLUTION`, continuation canceled-at-consumer / `RECOVERY_HOME` |
| `PLACEHOLDER_WRITE_FAILED` | same op | reporting `FAILURE_PLACEHOLDER_TARGET`, continuation canceled-at-consumer / `RECOVERY_HOME` |
| `OPERATION_CANCELED` | none | settlement `OUTCOME_CANCELED` at `REORDER_CANCELED_AT_CONSUMER`, carrying the proposal, `RECOVERY_HOME` |

Interaction is still armed here — [D-1](08-compatibility-ledger.md#d-1).

## 2.8 `SORTABLE_SETTLING`

Readiness gate check differs from draggable: advance requires `presentation.stage !== PRESENTATION_WATCHING` (so `ABSENT` and `TERMINAL` both pass), and `landing.stage === LANDING_TERMINAL`.

| Event | Guard | Behaviour |
| --- | --- | --- |
| `INTERACTION_STOPPED` | same op | `interactionStopped = true`, advance |
| `PRESENTATION_SETTLED` (`error === undefined`) | `WATCHING` ∧ currency match | presentation → `TERMINAL`, advance |
| `PRESENTATION_SETTLED` (`error !== undefined`) | as above | reporting `FAILURE_PRESENTATION_READY`; continuation = same settling state with outcome `OUTCOME_FAILED` (domain kept), `RECOVERY_IMMEDIATE`, landing `TERMINAL`, presentation `TERMINAL` |
| `LANDING_PLAN_RESOLVED` | `PREPARING` ∧ match | landing → `STARTING`, emit `START_LANDING{timing: cfg.landingTiming}` |
| `LANDING_STARTED` / `LANDING_FINISHED` / `LANDING_PINNED` | stage + match | → `RUNNING` / → `COMPLETING` + `PIN_LANDING` / → `TERMINAL` + advance |
| landing failures (5 kinds) | match | reporting; `LANDING_PLAN_FAILED` maps to `FAILURE_HOME_TARGET` when recovery is `HOME`, else `FAILURE_PLACEHOLDER_TARGET` |

## 2.9 `SORTABLE_REPORTING`

| Event | Guard | Behaviour |
| --- | --- | --- |
| `FAILURE_REPORTED` | same op | If continuation is settling **and already fully gated** → `finalizeSettlement`. Else if settling → `settlementEffects(continuation)` (re-emits `STOP_INTERACTION`, and `PREPARE_SORTABLE_LANDING` if `PREPARING`). Else → commit idle + `RETIRE_OPERATION`. |

## 2.10 `SORTABLE_FINALIZING`

| Event | Guard | Behaviour |
| --- | --- | --- |
| `FINALIZATION_COMPLETED` | same op | idle + `RETIRE_OPERATION` |
| `FINALIZATION_FAILED` | same op | `SORTABLE_REPORTING` with the **pre-computed** `failureCause` carried in the finalizing state, continuation idle |

Terminal-callback selection (`finalizeSettlement`): domain `ACCEPTED` or `NO_OP` → `onFinish`; `REJECTED` or `CANCELED` → `onCancel`; otherwise none. `failureCause` is computed at the same time and stored, so a throwing terminal callback is attributed to `FAILURE_FINISH_CALLBACK` / `FAILURE_CANCEL_CALLBACK` consistently.

---

# 3. Cross-cutting exit invariants

1. `DRAG_IDLE` / `SORTABLE_IDLE` hold no operation, no resources, no attempts.
2. Every non-idle phase holds exactly one operation identity.
3. Every terminal path passes through `RETIRE_OPERATION`, which runs `resetOwners()` then releases `OperationResources`.
4. No phase accepts an event whose operation identity differs from its own.
5. `advanceSettlement` / `advance` is the only route from settling to finalizing, in both features.

## 4. Approved target deviations from this baseline

1. Release closes pointer/spatial interaction before final geometry, while a dedicated Escape/controller-cancel path remains alive through consumer resolution (D-1).
2. Sortable cancellation during activation no longer reports `FAILURE_ACTIVATION`: acquisition-stage cancellation abandons silently; post-commit starting-stage cancellation settles normally through `onCancel` (L-9).
3. Readiness failure never produces a later terminal callback in either feature (D-3).

These are deliberate ledger changes, not reasons to preserve the old event rows.