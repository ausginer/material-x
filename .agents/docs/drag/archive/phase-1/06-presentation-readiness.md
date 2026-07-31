# Artifact 6 — Authored-presentation barrier and readiness replacement

## 1. The barrier

Temporary presentation (lift, and for sortable the placeholder) may be released only when **both** independent gates are complete:

```
landing finished or was skipped
  AND
the consumer's authored presentation is ready
```

Plus a third, feature-internal gate: `interactionStopped`.

Draggable's readiness predicate (`helpers.ts:91`):

```ts
lifecycle.interactionStopped &&
  landingTerminal(lifecycle.landing) &&
  presentationTerminal(lifecycle.presentation);
```

where `landingTerminal` accepts `LANDING_ABSENT | LANDING_TERMINAL` and `presentationTerminal` accepts `PRESENTATION_ABSENT | PRESENTATION_TERMINAL`.

Sortable's (`settling.ts:51`):

```ts
next.interactionStopped &&
  next.landing.stage === LANDING_TERMINAL &&
  next.presentation.stage !== PRESENTATION_WATCHING;
```

These are equivalent in effect, but sortable never uses `LANDING_ABSENT` — its `createSettlement` emits either `LANDING_TERMINAL` (immediate recovery) or `LANDING_PREPARING`.

## 2. Gate independence

The two branches start and settle independently and neither awaits the other:

- readiness starts at `WATCH_PRESENTATION`, emitted in the same effect batch as `STOP_INTERACTION` and `PREPARE_*_LANDING`;
- landing starts at `PREPARE_*_LANDING` and proceeds `PREPARING → STARTING → RUNNING → COMPLETING → TERMINAL`;
- whichever finishes first flips its own gate and calls `advanceSettlement`, which finalizes only when all gates are terminal.

**Both completion orders must be tested**, for both features:

| Order | Expectation |
| --- | --- |
| landing finishes, then readiness resolves | release + terminal callback at readiness |
| readiness resolves, then landing finishes | release + terminal callback at landing pin |
| readiness absent | gate is `TERMINAL`/`ABSENT` from the start; release at landing pin |
| landing skipped (`RECOVERY_IMMEDIATE`) | gate `TERMINAL` from the start; release at readiness |
| both absent | release as soon as `INTERACTION_STOPPED` arrives |

## 3. Timeout

`PRESENTATION_READY_TIMEOUT = 500` ms (`src/kernel/presentation-ready.ts:30`).

A timeout settles the watch with a `DOMException` of name `TimeoutError` and message `drag: presentationReady did not settle within 500ms`. It is reported as a readiness **failure**, not a silent success — a stuck gesture is worse than a late render.

`watchPresentationReady` is one-shot: `done` guards both the promise callbacks and the timer, and the returned disposer sets `done` and clears the timer so a late settlement is inert.

## 4. Readiness failure replaces the settlement

A rejection or timeout is not merely a failed boolean gate — it replaces the active settlement while **retaining temporary presentation**.

### 4.1 Draggable

`decideSettling`, `PRESENTATION_SETTLED` with `error !== null`:

1. build `failedSettlement(operation, lifecycle.outcome.domain, hasHomeTarget)` — outcome `OUTCOME_FAILED`, **domain preserved**, recovery `HOME` when a home resolver exists else `IMMEDIATE`, presentation gate `TERMINAL`;
2. carry `interactionStopped` forward from the failed settlement;
3. `reportFailure(..., FAILURE_PRESENTATION_READY, error, previousDomain, continuation, onError)`;
4. `DRAG_REPORTING_FAILURE` → `onError` → `FAILURE_REPORTED`;
5. `decideReporting` re-enters the continuation: re-emits `STOP_INTERACTION` if not already stopped, and `PREPARE_FREE_LANDING` if the replacement landing is `PREPARING`;
6. the replacement landing runs to `TERMINAL` on its **own new `landingId`** (`createSettlement` → `nextLanding` bumps it), so any in-flight landing from the destination settlement is inert by currency;
7. release and terminal callback happen only when the replacement settlement reaches its own gates.

Because the outcome is `OUTCOME_FAILED`, `advanceSettlement` selects **no** terminal callback. A readiness failure therefore produces `onError` and no `onFinish`/`onCancel`.

### 4.2 Sortable

`decideSettling`, `PRESENTATION_SETTLED` with `error !== undefined`:

continuation is the same settling state with `outcome = {result: OUTCOME_FAILED, domain}`, `recovery = RECOVERY_IMMEDIATE`, `landing = TERMINAL`, `presentation = TERMINAL`.

**No replacement landing.** Presentation is released as soon as the reporting checkpoint returns and the gates are met. `finalizeSettlement` also selects no callback for a `null`… — note that here `domain` is preserved and non-null, so `finalizeSettlement` _would_ select `onFinish`/`onCancel` based on the preserved domain type, unlike draggable which suppresses it via `OUTCOME_FAILED`.

> Precisely: sortable's `finalizeSettlement` branches on `state.outcome.domain`, not on `state.outcome.result`. A readiness failure after an accepted reorder therefore still calls **`onFinish`** with the accepted domain, in addition to `onError`. Draggable in the same situation calls only `onError`.

### 4.3 <a id="asymmetry"></a>The current asymmetry and target decision — D-3

|  | Draggable today | Sortable today | Target |
| --- | --- | --- | --- |
| Replacement recovery | `HOME` if `resolveHomeTarget`, else `IMMEDIATE` | always `IMMEDIATE` | preserve feature-specific recovery |
| Replacement landing | yes, new `landingId` | no | unchanged |
| Terminal callback after readiness failure | none | `onFinish`/`onCancel` per preserved domain | **none for either feature** |
| Error sentinel | `error !== null` | `error !== undefined` | discriminated settlement, no sentinel ambiguity |

**Resolved (D-3, 2026-07-24).** A readiness rejection or timeout changes the outcome to failed and reports `onError`; it must not later call `onFinish` or `onCancel` in either feature. This fixes sortable's double terminal reporting. Recovery itself remains feature-specific for this rewrite: draggable performs a replacement home landing when available, while sortable releases immediately.

The implementation must retire the failed readiness/destination attempts, stage a replacement failed settlement, retain temporary presentation until that replacement reaches its own terminal gates, and preserve the original domain in the error context without using it to select a terminal callback.

### 4.4 <a id="currency"></a>Currency validation — D-5

Draggable's barrier re-checks `operation.current(currency)` inside the settle callback before dispatching. Sortable's does not — it dispatches unconditionally and relies on the FSM's `PRESENTATION_WATCHING` + currency guard.

Both are safe today, because the FSM guard is sufficient. **Resolved (D-5):** the target validates identity both at the async producer/completion boundary and again when applying the queued action. This is a tightening with no observable change and does not require a dedicated owner object.

## 5. Home / no-home behaviour

| Feature | Home target present | Home target absent |
| --- | --- | --- |
| Draggable, rejected drop | `RECOVERY_HOME` — animates back to `resolveHomeTarget(...)` | `RECOVERY_IMMEDIATE` — snaps |
| Draggable, cancel | as above | as above |
| Draggable, readiness failure | replacement home landing | immediate release |
| Sortable, rejected reorder | `RECOVERY_HOME` — animates to the item's home slot | n/a (sortable always has a slot) |
| Sortable, accepted reorder | `RECOVERY_DESTINATION` | n/a |
| Sortable, readiness failure | immediate | immediate |

Draggable's no-home fallback is `RECOVERY_IMMEDIATE`, defined in `createSettlement`: the landing gate is `LANDING_TERMINAL` from the start, so the settlement waits only on interaction and readiness.

## 6. Required tests

1. Both completion orders, both features (4 tests).
2. Readiness absent — gate short-circuits (2).
3. Timeout at 500 ms produces `TimeoutError` and releases (2).
4. Late readiness after retirement is inert (2).
5. Readiness failure after accept, with and without a home target (4).
6. Readiness failure after reject (2).
7. Terminal callbacks fire only after presentation release (2).
8. Reduced motion and accepted free drops still obey both gates (2).
9. Interaction may stop before presentation is released (2).
10. Readiness failure reports only `onError` and never a later terminal callback in either feature; recovery remains draggable-home/immediate versus sortable-immediate (coverage for both features and both prior domain kinds).