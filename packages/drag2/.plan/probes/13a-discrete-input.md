# Probe 13a — discrete (keyboard) input

**Result: the frozen SPI cannot express it.** Four negative assertions, each proved by compilation. Typed probe: [`packages/drag2/tests/probes/13a-discrete-input.ts`](../../../../packages/drag2/tests/probes/13a-discrete-input.ts).

Contract 00 requires a _failing executable case_, not a prose finding. The probe is that case: `tsc` errors on an unused `@ts-expect-error`, so a green `npx just typecheck` in `packages/drag2` is a standing assertion that every N-row below still fails to compile. If a later contract revision makes one expressible, the build breaks and the probe has to be revisited — which is the property a prose finding does not have.

## The case

A keyboard command is a **complete one-slot operation with no pointer**, whose feasibility must be answered **synchronously inside the native listener**, so that `preventDefault()` is called only when the command is possible.

Both halves matter, and the second is the one the roadmap had not stated precisely. "No pointer" alone would be an awkward fit. "No pointer _and_ the answer has to reach the listener before it returns" is not a fit at all, because every behavior-initiated entry in the frozen SPI is fire-and-forget by construction.

## What fails

| # | Claim | Proved by |
| --- | --- | --- |
| **N-1** | `admit` is closed to non-pointer events. Its parameter is `PointerEvent`, and `KeyboardEvent` is assignable in neither direction, so method-position bivariance does not rescue it. `BehaviorSpec` has no second admission member. | compile |
| **N-2** | `KernelHost` owns no extensible ingress. Its six members are `realm`, `root`, `dispatch`, `fail`, `cancel`, `destroy`. A behavior that wants `keydown` must reach past the SPI to `host.root`, putting the listener's lifetime outside the kernel's ingress abort and outside I-6's terminal barrier. | compile |
| **N-3** | `dispatch` returns `void`. The listener cannot learn whether the command was feasible, because feasibility is decided in `prepare`, which runs on the drain — after the listener returned. | compile |
| **N-5** | There is no way to mint an operation without a press. `ActivationScope` is _granted_, carrying the lift session and grab rect the kernel acquired during `pointerdown`; nothing requests one, and `KernelHost` has no `activate`. | compile |

**N-3 is the load-bearing one.** The others have workarounds that are merely ugly. N-3 has none: the information flows the wrong way through the only behavior-initiated entry point that exists.

### N-4 — stated as a positive, deliberately

A decision-shaped `ActionTransition` **compiles**: `{}` accepts `{ consumed: boolean }`, and `prepare` may decline with `null`. So the SPI has no trouble _representing_ a feasibility answer. What it has no route for is **delivering** one — the staged value flows kernel → `effect`, and `effect` runs on the drain.

This is recorded as a compile rather than an error because it changes what Phase 14 has to add. The missing thing is not a richer action payload; it is a synchronous return path.

## Runtime facts the typechecker cannot see

00 warns that typecheck cannot catch a lifecycle error, so these are read from the executor and cited, not asserted:

- **R-1.** The kernel registers exactly one ingress listener, `pointerdown` on `root` — `src/kernel/kernel.ts:1970`, inside `arm()`. The per-operation `keydown` listener (`src/kernel/pointer.ts:48`) exists only while an operation is live and calls exactly one thing: `onEscape` → `cancel(CANCEL_ESCAPE)`.
- **R-2.** `admit` has one call site, `admitPress` (`kernel.ts:647`), reached only from `onPointerDown`. Even with N-1 relaxed, the kernel would never call it for a key.
- **R-3.** `PENDING → ACTIVE` is a pointer-distance test (`kernel.ts:1543-1547`). A command has no travel, so an operation admitted as a press would sit in `PENDING` forever. **A command is not "a press with no moves"** — it has to skip `PENDING` entirely.
- **R-4.** The kernel frame slice has no room for a pointerless operation: `pointerId` is a `number` with `-1` as the idle sentinel (`frames.ts:52`), and every sample is gated on `event.pointerId !== current.pointerId` (`kernel.ts:616`).

R-1…R-4 are why 02 §`ActionTransition` was right that keyboard **revises the kernel contract** rather than fitting behind a third action tag. The revision is not a workaround being blessed; it is the only place the change can go.

## What already fits

Recorded because an unchanged seam validated by a second input mode is a stronger claim than an unexamined one.

- **P-1.** The rule ports unchanged. `keyboardInsertion` is pure — a function of a snapshot, an item and a direction — and needs no kernel affordance at all.
- **P-2.** No frame widening. The destination gap is the same `insertion` field the pointer path already commits.
- **P-3.** Everything downstream of an existing operation is reachable as-is: `release.prepare` stages the `ResolutionCommand`, `settlement` classifies the five cases, `anchorTarget` produces the landing point.

**The gap is confined to ingress and admission.** That is a much narrower claim than "keyboard does not fit", and it is what keeps the Phase 14 revision small.

## Candidate vocabulary — not a decision

Phase 14 owns the revision. The probe carries a compiling sketch so the case is stated with a shape rather than a paragraph, and 02's deferred "small typed lifecycle-intent vocabulary" stops being deferred.

```ts
type IntentDecision<Prepared extends {}> =
  | { type: INTENT_DECLINED }
  | { type: INTENT_OPERATION; visual: HTMLElement; prepared: Prepared };

type IntentTransition<Part extends object, Prepared extends {}> = {
  types: readonly string[];
  decide(event: Event, draft: Draft<Part>): IntentDecision<Prepared>;
};
```

Three properties it keeps on purpose:

1. **The kernel still owns ingress.** The behavior declares _which_ event types to bind on the root; it never registers a listener, so the lifetime stays inside the kernel's ingress abort.
2. **The behavior still never drives a transition.** `decide` returns a _value_; the kernel mints, lifts, commits phases and owns the envelope, exactly as for a press. H-3 is preserved.
3. **The decision is synchronous and reaches the producer** — which is the whole point, and the one thing the frozen SPI cannot do.

The probe's driver sketch is `declare`d and inert on purpose. Whether a command commits `ACTIVATING → ACTIVE → RELEASING` in one synchronous envelope or needs a ninth phase is exactly what Phase 14 decides, and this probe must not appear to have decided it.

## What Phase 14 must answer

1. Synchronous envelope or a new phase for a pointerless operation (R-3).
2. What identity a pointerless operation carries, given `pointerId`'s `-1` sentinel and the sample gate (R-4).
3. Whether `preventDefault()` stays contractually confined to `admit`, or the contract names a second position where it is valid.
4. Whether `types` belongs on the transition or on `BehaviorConfig` alongside `actionTags` — the same "static spec data so `arm()` can validate it" argument applies.

## What this probe does not claim

- That the candidate is the right shape. It is _a_ shape that compiles.
- That the sortable's keyboard behavior is correct end-to-end. Typecheck cannot catch a lifecycle error; the executable lifecycle cases belong to Phase 16 and the 05 test matrix.
- That anything here is licence to skip the re-verification in Phase 14.