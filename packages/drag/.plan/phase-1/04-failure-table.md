# Artifact 4 — Known-failure table

Every `FailureCause.stage` in `src/kernel/protocol.ts`, with the phase that raises it, its recovery, its FIFO precedence, and whether later queued work drains or goes stale.

`onError` is invoked through `reportError_(error, callback)`: if the callback is absent **or itself throws**, the error falls through to the platform reporter. `onError` never re-opens the operation and never changes the continuation.

## 1. Stage table

| Stage | Value | Feature | Raised in | Continuation | Terminal callback |
| --- | --: | --- | --- | --- | --- |
| `FAILURE_ACTIVATION` | 41 | both | arm failure, activation acquisition, `onStart` throw | **idle** — operation abandoned | none |
| `FAILURE_PRESENTATION_LEASE` | 36 | sortable | `OPERATION_ARM_FAILED` in `SORTABLE_PENDING` | idle | none |
| `FAILURE_MOVE` | 25 | draggable | motion observation failure, `onMove` throw, release resolve failure | failed settlement (`OUTCOME_FAILED`) | none |
| `FAILURE_RENDERER_WRITE` | 35 | both | `PRESENT_MOTION` write failure | failed settlement / cancel+`RECOVERY_HOME` | none |
| `FAILURE_CONTROLLED_UPDATE` | 26 | draggable | reserved — not currently raised | — | — |
| `FAILURE_INVALIDATION` | 27 | sortable | `ACTIVE_INSERTION_FAILED` | cancel + `RECOVERY_HOME` | `onCancel` |
| `FAILURE_SCHEDULED_FRAME` | 28 | — | reserved — not currently raised | — | — |
| `FAILURE_PLACEHOLDER_TARGET` | 34 | sortable | placeholder write failure; landing-plan failure when recovery is `DESTINATION`/`IMMEDIATE` | cancel, recovery varies by phase | `onCancel` |
| `FAILURE_HOME_TARGET` | 33 | both | `resolveHomeTarget` throw; sortable landing-plan failure when recovery is `HOME` | `OUTCOME_FAILED`, `RECOVERY_IMMEDIATE` | none |
| `FAILURE_LANDING_TIMING` | 29 | both | `landingTiming()` throw | `OUTCOME_FAILED`, `RECOVERY_IMMEDIATE` | none |
| `FAILURE_ANIMATION_CREATE` | 30 | both | `Element.animate` failure | as above | none |
| `FAILURE_LANDING_INTERRUPTED` | 32 | both | landing animation rejected/interrupted | as above | none |
| `FAILURE_LANDING_PIN` | 31 | both | final transform pin failure | as above | none |
| `FAILURE_DROP_RESOLUTION` | 37 | draggable | `onDrop` throw or rejection, or invalid resolution value | failed settlement | none |
| `FAILURE_REORDER_RESOLUTION` | 38 | sortable | `onReorder` throw/rejection, invalid value, proposal build failure | cancel-at-consumer, recovery `HOME` or `IMMEDIATE` by phase | `onCancel` |
| `FAILURE_PRESENTATION_READY` | 42 | both | `presentationReady` rejection or 500 ms timeout | see [artifact 6](06-presentation-readiness.md) | feature-specific |
| `FAILURE_FINISH_CALLBACK` | 39 | both | `onFinish` throw | idle | none (already ran) |
| `FAILURE_CANCEL_CALLBACK` | 40 | both | `onCancel` throw | idle | none |

Two stages — `FAILURE_CONTROLLED_UPDATE` and `FAILURE_SCHEDULED_FRAME` — are declared but never raised. **Resolved (L-8):** remove them from the target public union. The package is pre-release and the values have never represented an observable recovery path.

## 2. Pre-commit vs post-commit

**Pre-commit failures leave `current` unchanged.** In the current architecture this is structural: `decide` is pure, so a throw inside it propagates to the session's `catch`, which panics rather than committing. All the failures in §1 are _post_-commit in that sense — they arrive as events, and the FSM commits a reporting state.

In the new two-frame runtime the distinction becomes real, and the rule is:

| Situation | Required behaviour |
| --- | --- |
| Preparation throws before commit | discard draft, roll back locally acquired resources in reverse order, enqueue a typed failure checkpoint behind anything consumer code already queued |
| Post-commit effect throws | keep the committed frame, enter a new transactional failure transition from it |
| Invariant violation / unknown effect | panic (§4) |

## 3. FIFO precedence

The ordering contract, in decreasing precedence for the _same_ operation:

```
DESTROY   >  CANCEL  >  FAILURE_CHECKPOINT
```

- **Destroy** terminalises: `session.close()` empties the queue and nulls the state, so a failure checkpoint queued afterwards is never dispatched and never observable. `onError` does not fire.
- **Cancel** queued by a callback lands before that callback's own throw checkpoint, because the callback's `dispatch(...FAILED)` happens in the `catch` after the callback body already enqueued the cancel.
- Two failures for the same operation: the first one committed wins, because it moves the phase to reporting, and reporting only accepts `FAILURE_REPORTED`.

Direct (non-queued) failure recovery is only permitted where **no arbitrary consumer code could have enqueued earlier work**. In the current code every failure arrives as a queued event, so this holds trivially. The new runtime, which performs direct post-commit effects, must not regress it: any failure raised after a consumer boundary must go through the queue.

## 4. Unexpected panic

Triggered by a throw escaping `decide` or `execute` — including the `assertNever` guards for unknown phase/effect.

Current sequence (`session.ts:116` + `runtime.ts:46`):

1. `close()` — `terminal = true`, `queue.length = 0`, `state = null`;
2. `panic(error)` → runtime's `reportFatal`, which first runs `effects.destroy()` (owners reset, `OperationResources.destroy()`) if not already destroyed;
3. `reportError_(error, undefined)` — reports **after** teardown;
4. the controller never reopens: every later `dispatch` sees `terminal`.

Disposer failures inside teardown are caught per-disposer by `createResourceScope.dispose` and reported individually, so they neither replace the initiating error nor stop later disposers. That satisfies the proposal's requirement and must be preserved verbatim.

Gap to close in Phase 2: step 1 nulls the state but the new design has two frames plus queued arguments, attempts and geometry caches. Panic must additionally clear both frames, staged settlements, cancel latches and DOM-bearing caches — see [artifact 11](11-retention-teardown.md).

## 5. Rules for the new runtime

1. Keep one `FailureCause.stage` per genuinely distinct recovery policy; do not mint success/failure pairs for ordinary synchronous calls.
2. Preserve `DESTROY > CANCEL > FAILURE` precedence and test it per callback.
3. Preserve teardown-before-report on panic.
4. Preserve best-effort, per-disposer error isolation.
5. Remove `FAILURE_CONTROLLED_UPDATE` and `FAILURE_SCHEDULED_FRAME` unless an actual target path is introduced before cutover; do not keep unused public stages for representational compatibility.
6. Cancellation is not an activation failure: sortable acquisition-stage cancel abandons silently, while post-commit starting-stage cancel follows normal canceled settlement (L-9).