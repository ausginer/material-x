# Artifact 5 — Resource exit-path matrix

Every acquired resource, its owner, its lifetime, and its release on each of the ten exit paths the proposal enumerates.

## 1. Lifetimes

Today's implementation has four. **Resolved D-1 requires the admitted-operation interaction lifetime to split in two**, giving five in the target runtime.

### 1.1 Why the split is mandatory

Today the pointer listeners, the Escape listener and the resolver's abort registration all hang off one signal and one scope:

- `armSession(resources.signal, …)` registers pointer move/up/cancel/lostpointercapture **and** the Escape `keydown` handler on a single `AbortSignal` (`kernel/pointer.ts:54-71`);
- the resolver's abort is registered into the _interaction_ scope via `operation.useInteraction(() => { if (!completed()) controller.abort(); })` (`draggable/effects/resolution.ts:72`).

That is precisely why `STOP_INTERACTION` is emitted _after_ consumer resolution today — the ordering keeps the resolver's signal un-aborted.

If the target runtime closes "interaction" at release as one unit, two things break simultaneously: Escape dies at release (the hatch D-1 exists to preserve), and the resolver receives an already-aborted signal because its registration lands in a closed scope. Neither is caught by any existing test, because no test observes the resolver signal during a _successful_ resolution.

### 1.2 Target lifetimes

| # | Lifetime | Contents | Closed at |
| --- | --- | --- | --- |
| 1 | Controller ingress | controller `pointerdown`; sortable container `keydown` | `destroy()` / panic |
| 2a | Motion ingress | pointer move/up/cancel/lostpointercapture, pointer capture, scroll + resize invalidation, spatial frame task | **release**, or settlement entry on cancel/failure paths |
| 2b | Cancellation & resolution | Escape listener, `cancel()` admissibility, the guarded abort registration for the current resolution attempt | resolver settles, or settlement entry |
| 3 | Temporary presentation | lift / top-layer entry, inline-style snapshot, renderer, placeholder | finalization, after landing + readiness |
| 4 | Replaceable async attempts | resolution, readiness watch, landing, spatial frame | per-attempt retirement |

Ordering invariant, generalised: **2a may close while 2b, 3 and 4 are still held; 2b may close while 3 is still held.** Closing is latched and idempotent in every case.

### 1.3 Resolver ownership

The resolution attempt is an **independently identified async attempt** (lifetime 4) that owns its own `AbortController`. Lifetime 2b owns only the _guarded abort registration_ for the currently identified attempt — the equivalent of today's `useWhile(!completed, abort)` — not the controller itself. No new autonomous owner object is introduced for this; the attempt is a plain record in the runtime container, and the guard is a closure over its identity.

### 1.4 Scope mechanics carried forward

`ResourceScope.dispose()` splices the disposer list before running it, so a disposer that re-enters teardown cannot run the same disposer twice; disposal is reverse-order (LIFO) and best-effort with per-disposer error reporting.

## 2. Resource inventory

| Resource | Lifetime | Acquired by | Disposer registered | Notes |
| --- | --- | --- | --- | --- |
| controller `pointerdown` listener | 1 | `createPointerSource` | `{signal: controllerSignal}` |  |
| container `keydown` listener (sortable) | 1 | controller ctor | `{signal: controllerSignal}` |  |
| session pointer listeners (`move`/`up`/`cancel`/`lostpointercapture`) | **2a** | `pointerSource.armSession` | motion signal | document-level; `armSession` takes two signals in the target |
| session `keydown` (Escape) | **2b** | `armSession` | cancellation signal | document-level; must outlive 2a |
| scroll (capture) + resize listeners | **2a** | `invalidation.arm(signal, …)` | motion signal | passive |
| pointer capture | **2a** | `acquirePointerCapture` | motion scope | best-effort; failure is benign |
| resolution `AbortController` | 4 | the resolution attempt record | **2b** holds `useWhile(!completed, abort)` | attempt owns the controller; 2b owns only the guarded registration |
| lift / top-layer entry | 3 | presentation owner | `presentation.use` | `LiftMode` decides the mechanism |
| inline-style snapshot | 3 | presentation owner | `presentation.use` | restores authored styles |
| renderer | 3 | presentation owner | `presentation.use` |  |
| placeholder element (sortable) | 3 | placeholder owner | `presentation.use` |  |
| readiness watch (timer + promise) | 4 | `watchPresentationReady` | barrier owner's `dispose` | 500 ms timeout |
| landing animation | 4 | landing owner | landing owner's `stop`/`destroy` |  |
| spatial `FrameTask` (rAF) | 4 | spatial owner | `spatial.cancel()` |  |
| rect index / geometry cache | 4 | spatial owner | reset on `resetOwners` | holds DOM element references |

## 3. Exit-path matrix

`R` = released, `—` = not held / already released, `K` = deliberately kept.

| Exit path | 1 ingress | 2a motion | 2b cancel/resolution | 3 presentation | 4 attempts | Callback order |
| --- | --- | --- | --- | --- | --- | --- |
| **Abandonment** (release below threshold) | K | R | R | — | R | none |
| **Partial activation failure** (lift / placeholder throws) | K | R | R | R (local rollback, reverse order) | R | `onError` only |
| **Cancel before activation resources commit** | K | R | R | — | R | none — clean silent abandon (see L-9) |
| **Cancel after activation** | K | R at settlement entry | R at settlement entry | K until finalize | R | `onError`? → landing → `onCancel` |
| **Release → resolution** | K | **R at release** | **K until the resolver settles** | K | resolution attempt live | — |
| **Accept** | K | R (already) | R when resolved | K through landing + readiness | R progressively | landing → readiness → release → `onFinish` |
| **Reject** | K | R | R | K through home landing | R | landing → release → `onCancel` |
| **No-op** (sortable) | K | R | R | K, immediate recovery | R | release → `onFinish` |
| **Cancel during resolution** (D-1) | K | R (already) | R, aborting the resolver signal | K until finalize | R | landing → release → `onCancel` |
| **Known failure** | K | R | R | K until finalize | R | `onError` → continuation → maybe `onCancel` |
| **Readiness replacement** | K | R (already) | R (already) | **K — explicitly retained** | destination attempts R, replacement attempts fresh | `onError` → replacement settlement → release, **no terminal callback** (D-3) |
| **Finalization** | K | R | R | **R — before the terminal callback** | R | release → `onFinish`/`onCancel` → retire |
| **`destroy()`** | R | R | R | R | R | **none** |
| **Panic** | R | R | R | R | R | report via platform reporter, **after** teardown (L-11) |

## 4. Ordered teardown sequences

### 4.1 Normal finalization

```
callbacks.finalize:
  presentation.release()          // lifetime 3
  stopSettlementOwners()          // lifetime 4
  onFinish() / onCancel()
  dispatch FINALIZATION_COMPLETED
    -> RETIRE_OPERATION
       resetOwners()              // idempotent second pass
       operation.retire()         // OperationResources.destroy(), ids reset to 0
```

### 4.2 `destroy()`

```
#terminal = true
runtime.destroy():
  session.close()                 // queue cleared, state nulled
  effects.destroy():
    terminal = true               // every later execute() returns STOP_BATCH
    resetOwners()                 // attempts + presentation
    operation.destroy()           // = retire() -> resources.destroy()
#controllerAbort.abort()          // lifetime 1
```

All synchronous, all before `destroy()` returns, idempotent via `#terminal`.

### 4.3 Panic

Identical to 4.2 minus the explicit `#controllerAbort.abort()` — the controller object's `#terminal` flag is _not_ set by a panic, so a later explicit `destroy()` still runs and aborts ingress. That is correct but subtle: **panic leaves the DOM `pointerdown` listener attached.** Since `session.dispatch` is inert after `close()`, a press does nothing observable, but the listener and its closure are retained.

> **Finding.** This is a real retention leak on the panic path: controller-level listeners and the whole `deps` closure survive a panic indefinitely unless the consumer also calls `destroy()`. The new runtime's panic should abort ingress too. Recorded in [artifact 11](11-retention-teardown.md#panic).

## 5. Leaf exception safety

The proposal requires every leaf acquisition to be all-or-nothing, or to register rollback before its first side effect. Current status:

| Leaf | Status |
| --- | --- |
| `acquirePointerCapture` | Safe — `try`/`catch`, returns a disposer that no-ops when capture was not held. |
| `armSession` | Safe — listeners bound to a signal; `operation.begin` catches and calls `failMechanical()`. |
| `watchPresentationReady` | Safe — timer id captured before the promise is attached; disposer clears it. |
| `createResourceScope.dispose` | Safe — splice-then-run, per-disposer `try`/`catch`. |
| presentation acquisition (lift, style snapshot, renderer) | **Needs audit** — multi-step DOM writes; the activation coordinator rolls back at the action level, which the proposal explicitly says is insufficient if a leaf writes then throws. |
| placeholder creation + insertion | **Needs audit** — same shape. |

Auditing those two is a Phase 2 entry task, not a Phase 1 blocker, but the finding is recorded here so it is not lost.

## 6. Rules for the new runtime

1. Preserve the §1.2 lifetimes as **independently releasable stages**: motion ingress may close while cancellation/resolution is still live, and cancellation/resolution may close while presentation is still held. The factory shape is not contractual — only the ordering and the latched idempotence are.
   - `armSession` must accept a motion signal and a cancellation signal separately.
   - The resolution attempt owns its own `AbortController`; the cancellation stage owns only the guarded abort registration for the currently identified attempt.
   - Do not introduce another autonomous owner object for this unless implementation pressure proves it necessary.
2. Keep LIFO, idempotent, best-effort disposal with per-disposer error isolation.
3. Preserve guarded abort semantics for unfinished consumer resolution; the helper need not remain named `useWhile`.
4. Acquire during preparation into a **local** rollback scope; transfer ownership only at commit. Every multi-write leaf must also be exception-safe itself.
5. Reject or immediately dispose late registration into a closed scope.
6. Abort controller ingress on panic (fixes L-11).
7. D-1 uses a distinct cancellation lifetime: pointer/spatial interaction stops on release, while Escape/controller cancel stays alive until the resolver settles.