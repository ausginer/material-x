# `Lifetime` and `ActionQueue` become classes, and `useWhile` leaves the SPI (D-200)

**Canonical entries:** `drag2:D-200`, which closes `drag2:F-274` and amends `drag2:D-21` and the grading clause of `drag2:D-170`. This record holds the evidence. The decision is stated in [`00-index.md`](../../contract/00-index.md) and is not restated here.

**Tree:** `01d88645f`, on `drag2/fin-review2`, with the owner's two untracked scratch files `src/kernel/lifetime1.ts` and `src/kernel/queue1.ts` beside it. Every line number below is into that tree.

**Scope, as set by the owner.** Remove `useWhile`. Replace `src/kernel/lifetimes.ts` with the class in `lifetime1.ts`, renamed to `lifetimes.ts` and brought up to what the current module carries. Replace `src/kernel/queue.ts` with the class in `queue1.ts`, renamed to `queue.ts`, with `ExecutionBracket` adapted to it. **Mid-session, the owner settled one point:** `clear()` empties in place (`length = 0`) and does not replace the array.

## `useWhile` has no caller it serves

| Site | What it is |
| --- | --- |
| `src/kernel/kernel.ts:1729` | **The only call.** `#openResolution` registers the resolver abort on the **cancellation** lifetime, guarded by `!attempt.completed`. |
| `src/kernel/spec.ts:265-267` | `ActivationScope` hands a behavior `motion` and `presentation` and **not** `cancellation`. So the only lifetime `useWhile` is called on is one no behavior ever holds. |
| `src/sortable/spec.ts:847,907` | The two first-party behavior registrations both use `use`. |
| `src/kernel.ts:94` | `LifetimeScope` is published from `./kernel.js`, so `useWhile` is SPI surface with no SPI caller. |
| `tests/kernel/lifetimes.node.test.ts:133,148` | Two direct unit cases. Nothing else in `tests/` names it. COVERAGE row 1176 names its guard in prose. |

**The guard survives at the call; the member does not.** The `!attempt.completed` test is load-bearing (the comment at `kernel.ts:1727`, and COVERAGE row 1176's mutation witness): aborting after completion fires `abort` on a signal a consumer may still be listening to. Inlined, the call is a `use` whose disposer tests the latch, so the behavior is identical.

**F-274 is closed by removal.** It asked that every published member could be detached, or that the receiver requirement be stated on the type. Removing the one member that broke that rule satisfied it on this tree. The class conversion then makes `use` receiver-sensitive too, which F-274's preferred option forbids. Its premise, though, was that every other member on the package's surfaces was receiver-free, and D-170 made that false: `BehaviorContext`'s `dispatch`, `fail`, `cancel` and `destroy` are prototype methods, and the SPI's convention is now **method syntax means a receiver is required**, which the step-0 gate enforces wherever it can see the type. `LifetimeScope` joins that convention rather than being an exception to it.

## The grading D-170 gave both handles, re-read

D-170 graded `createLifetime` and `createActionQueue` as _handles rather than entities_: under seventy lines, **none with an invariant spanning two fields**, with `createActionQueue` kept as _the deliberate outlier_ and reconfirmed by Arc A (D-180).

**For `Lifetime` the premise does not hold.** `use` must not push once `dispose` has begun, so `finalized` gates every write to the disposer stack: `finalized ⇒ stack drained and never pushed again`. That is an invariant spanning two fields, and it is the one the late-registration branch exists to keep (02 §Registration after closure).

**For `ActionQueue` the conversion is D-170 §The ownership boundary applied, not a change of mind about its size.** Today the bracket reads `this.#queue.actions[i]` and `this.#queue.args[i]` directly (`execution.ts:223-224`): two public mutable fields of a record, read and indexed from outside it. Clause (1) of that boundary forbids exactly that for an entity. The scratch class owns its storage, exposes no field, and **removes the cross-array pairing invariant by construction**, because pairs sit adjacent in one array instead of at the same index in two.

**What stays with the bracket, as D-180 required.** The latch, `#running`, the depth counter, the admission boundary and panic routing stay in `ExecutionBracket`. The scratch `apply(callback)` moves only the **iteration** into the queue. The decision to stop iterating comes back through the callback's `false`, so the queue still decides nothing about policy. That is the line D-180 drew (_`closed`, `running` and the drain loop leave because they are policy_), now drawn one statement finer: the loop's bounds are storage and its stopping condition is policy.

## Sites the conversion touches

**Detached reads the receiver gate will report**, taken from a census of `src`, `tests` and `bench`:

| Site | Read | Disposition |
| --- | --- | --- |
| `kernel.ts:2235` | `this.#unwind(this.#operation.lifetimes.presentation.dispose)` | Becomes a prototype method read detached. **It must be wrapped**, per D-170's practice: wrapped, never suppressed. |
| `kernel.ts:556`, `kernel.ts:646` | `this.#unwind(this.#operation.lifetimes.dispose)` | `OperationLifetimes.dispose` is a closure on a record built by `createOperationLifetimes`. It holds no mutable state, so under D-170's grading it stays a function, and these two reads stay receiver-free. |
| `kernel.ts:1244,1255,1363-1364,1620,1868` | Called, not read. | Unaffected. |

**Names that leave the module and are pinned elsewhere:**

- `tests/kernel/vocabulary.node.test.ts:117-121` pins `createLifetime` under _the full lifetime_; the class replaces it with `Lifetime` as a value.
- 02 §What stays internal names `createLifetime`.
- `tests/kernel/queue.node.test.ts` imports `clearQueue`, `createActionQueue` and `enqueue`, and reads `queue.actions` and `queue.args`.
- COVERAGE rows 1053, 1059 and 1077 name `clearQueue`.

**The hot path.** `kernel.ts:835` dispatches `MOVE` once per `pointermove`, and every dispatch outside admission drains, and every drain clears in a `finally` (`execution.ts:229`). So `clear()` runs once per pointer sample. The scratch `clear()` assigns `this.#queue = []`, which is **one array allocation per pointer sample**. Today's `clearQueue` truncates in place and allocates nothing. The owner chose in-place truncation when this was raised.

**Truncating in place is also the safer drain semantics.** `apply` reads `this.#queue.length` on every iteration, so an append during a drain is reached in the same drain, which is I-1 and COVERAGE row 1049. With truncation, a `clear()` reached during `apply` ends the iteration. With replacement, `apply` would keep its index and continue over the **new** array, skipping its first entries. No path reaches `clear()` during `apply` today: `close()` defers teardown while `#depth > 0`, and every drain runs at depth ≥ 1. But truncation does not depend on that argument and replacement does.

## Smaller properties found while reading the scratch files

- **`LifetimeScope` must be declared, not derived.** The scratch file's hand-written `interface` with method syntax is what D-170 §The ownership boundary clause (2) requires. The contract's `Readonly<Pick<Lifetime, …>>` spelling is a mapped type and is silent to the gate. The contract was already stale on this tree, whose `LifetimeScope` is a `Readonly<{ … }>` type literal.
- **`signal` must be `readonly` on the interface.** The scratch interface declares `signal: AbortSignal`, which lets an assignment typecheck that the getter-only class rejects at runtime.
- **`#finalized` is derivable and may stay.** Nothing but `dispose` aborts the private controller, and `abort()` sets `aborted` before it runs listeners, so `this.#controller.signal.aborted` answers the same question at every point, including inside an abort listener that calls `use`. This is recorded so a cleanup pass does not re-derive it. It is not required, because the read costs a platform getter on each `use` in exchange for one boolean per lifetime.
- **`#disposers = []` at the end of `dispose` may stay.** Lifetimes are disposed three times per gesture, which is not a hot path, and since `finalized` is already set, no reentrant `use` can reach the array. In-place truncation and replacement are indistinguishable there.