# 6. Readiness, landing and animation

## Two independent gates

Temporary presentation — the lift and the placeholder — is released only when **both** gates are complete:

```text
landing finished or was skipped   AND   authored presentation is ready
```

The gates start and settle independently; neither awaits the other. They are two `boolean` fields on the committed frame (`landingDone`, `readyDone`), and `advanceSettlement` is the single reader. Landing and React rendering therefore run concurrently, which is the point: a consumer must not serialize its render ahead of the animation.

| Situation | `landingDone` at settlement entry | `readyDone` at settlement entry |
| --- | --- | --- |
| No `landing()` feature, no `presentationReady` | `true` | `true` — finalizes in the same drain |
| No `landing()` feature, readiness supplied | `true` | `false` |
| `landing()` installed, no `presentationReady` | `false` | `true` |
| Both | `false` | `false` |
| `RECOVERY_IMMEDIATE` (no-op, failure recovery) | `true` | per resolution |

## The readiness protocol (C-11)

The library must not assume that returning from `onReorder` means React has committed the authored DOM. Readiness is an **explicit consumer acknowledgement**, never inferred from slots, mutations, collection order or elapsed time.

```ts
onReorder(request) {
  setPendingRequest(request);
  setItems((items) => applyReorder(items, request));

  return ReorderResolution.accept(readiness.promise);
}

useLayoutEffect(() => {
  readiness.resolve();
}, [items]);
```

The promise is **returned**, not awaited. Awaiting it inside `onReorder` would serialize the render ahead of the landing animation instead of overlapping it.

### Binding

A readiness watch is bound to the **settlement attempt**, which is created when the operation enters `SETTLING`. Identity is validated twice — at the producer boundary (`runtime.readiness !== attempt` before dispatching) and again when the queued `READINESS_SETTLED` is applied (`runtime.readiness !== attempt || phase !== SETTLING`). Late readiness from an older operation is inert at both points.

### Timeout

Default 500 ms, exposed as `KernelSpec.readinessTimeout`. An unresolved promise would otherwise strand the gesture forever — lift held, placeholder pinned, container undraggable, no abort path. Timing out is a presentation failure, but cleanup still runs: a late authored render is a visual glitch, a stuck gesture is a broken component.

### Failure replacement

A readiness **rejection or timeout replaces the settlement** while keeping the presentation owned and visible:

- old attempts go inert;
- the outcome becomes `OUTCOME_FAILED` with the domain result preserved;
- recovery restarts as `RECOVERY_IMMEDIATE` — the placeholder is already where the outcome put it, so there is nothing left to animate;
- it reports through `onError` **only**. No `onFinish` and no `onCancel` follow.

One outcome must never produce both an error report and a terminal callback.

### Required test matrix

Consumer accepts but readiness is delayed · landing completes before React · React completes before landing · both complete immediately · stale readiness from an older operation · readiness never settles and the timeout policy applies · readiness resolved from a real `useLayoutEffect()` fixture.

## Landing (C-9)

On release the lifted visual moves from its current position to the placeholder.

```ts
type LandingContext = Readonly<{
  visual: HTMLElement;
  /** Full transform string for a viewport delta, including the lift's base. */
  compose(x: number, y: number): string;
  from: Point;
  target: Point;
  realm: DOMRealm;
  /** Attempt-bound. A stale call is inert. */
  done(): void;
  fail(error: unknown): void;
}>;

type LandingRunner = Readonly<{
  /** Idempotently commit the completed target. Only from an accepted completion. */
  pin(): void;
  /** Silent terminal teardown: never pin, dispatch nothing. */
  destroy(): void;
}>;

type LandingRunnerFactory = (context: LandingContext) => LandingRunner;
```

The kernel computes `from`/`target` and owns the attempt. The runner owns only mechanics; it never decides whether settlement is accepted, rejected, cancelled or failed.

**Default: no runner.** Without `landing()`, `spec.startLanding()` returns `false`, the kernel opens the gate immediately, and the visual is pinned at the placeholder in the same drain. No animation module is imported and no fake asynchronous work is created.

**`landing({ duration, easing })`** installs a Web Animations runner honouring `prefers-reduced-motion` by collapsing duration to zero.

**`landing({ run })`** replaces the runner entirely. A spring implementation driving `requestAnimationFrame` and calling `context.done()` when it settles is a first-class citizen: nothing in the contract assumes a CSS timing function or a finite, known duration.

### Recovery targets

| Recovery | Target | When |
| --- | --- | --- |
| `RECOVERY_DESTINATION` | the placeholder's current rect | accepted reorder |
| `RECOVERY_HOME` | the visual's grab origin | rejected reorder, cancellation, most failures |
| `RECOVERY_IMMEDIATE` | none; gate opens at once | no-op, readiness failure, landing failure |

For `RECOVERY_HOME` the placeholder returns to the home slot **before** the plan is measured, so the visual and the footprint agree.

### Long-running landing correctness

A deliberately long landing (ten seconds is an explicit test case) is a lifecycle case, not cosmetics. During one:

- the lifted visual and the placeholder remain valid and owned;
- `destroy()` cleans them immediately — the runner is destroyed silently, the presentation lifetime disposes, and no callback fires afterwards;
- `cancel()` follows the same deterministic precedence as in any other phase;
- a stale completion is inert at both validation points;
- collection changes cannot make the visual land at an obsolete target, because the operation's snapshot is frozen from `RELEASING` onward;
- inline styles and temporary transforms are restored **exactly once** — the style lease is latched;
- a disposer failure is reported and does not prevent the remaining cleanup, so the controller is never left half-owned.

### Required test matrix

Immediate landing · long landing duration · custom animation runner · interrupted landing · late landing completion after a newer operation · destroy during long landing · animation creation throws.

## Layout displacement (C-10)

When the placeholder moves, neighbouring elements may animate between their old and new positions. Two seams bracket the single placeholder-move writer:

```text
slots.beforeMove[…]      measure current rects
placeholder DOM move     the sole writer of placeholder position
slots.afterMove[…]       re-measure, write inverted transforms, play
```

The library performs only the measurements and temporary transform writes that make CSS animation possible. The consumer configures duration and easing externally, preferably through CSS. The architecture must permit no animation, ordinary CSS transitions, arbitrary durations, arbitrary easing, interruption and retargeting. No specific technique is mandated, though FLIP is the expected implementation.

**Displacement is not a lifecycle gate.** It never holds settlement, never delays presentation release, and never blocks `destroy()`. A cosmetic transition must not be able to strand a drop.

**Retargeting.** A placeholder move while a previous displacement is still running cancels that animation and replays from the element's _current computed_ transform, not from its authored origin. The feature keeps a per-element record and its `retire` hook restores every touched element exactly once, even if a later animation was never created.

**Staleness.** A displacement completion carries no operation identity because it can affect nothing outside the feature's own element map. Retirement empties that map, so a completion arriving afterwards finds nothing to write.

### Required test matrix

No-animation default · CSS layout transition · interrupted and retargeted displacement · stale layout-animation completion · retirement while displacements are in flight.

## Default presentation behavior

The floor, which a minimal composition must actually hit:

- placeholder movement is immediate;
- landing is immediate;
- no animation dependency is imported;
- absence of animation creates no asynchronous work — a no-animation accepted drop finalizes within the same drain as its resolution when readiness is also synchronous;
- optional animation code stays tree-shakeable.