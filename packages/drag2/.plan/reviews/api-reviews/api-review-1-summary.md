# API review synthesis — working hypotheses to attack

This is a synthesis of two independent API reviews and the follow-up owner discussion. It is **not a decision record**. Treat every conclusion below as challengeable.

The review found a recurring pattern: several expensive internal mechanisms appear to exist not because the underlying capability is inherently difficult, but because the public contract promises unusually strong behavior around misuse, reentrancy, or live mutation. Both independent reviews identified synchronous reentrant `destroy()`, live collection reconciliation, feature/composition surface, custom landing, readiness, and the public failure/result vocabulary as major cost centers.

The current direction is therefore **not “remove extensibility”**. It is: keep useful extension points, stop paying large runtime/lifecycle costs to protect consumers from violating their contracts, and hide implementation architecture where exposing it brings no consumer value.

## 1. Public layers

The desired model is progressive disclosure:

```text
high level
  sortable(...)
  freeDrag(...)

behavior extension
  sortable/feature-utils

low level
  kernel/*
```

Custom behaviors remain a real requirement. A developer who needs a completely new interaction should be able to use a supported lower-level kernel API and build the machine themselves.

However, this does **not** imply that `draggable(root, behavior)` needs to be the ordinary public constructor. The current preference is:

```ts
sortable(root, options);
freeDrag(root, options);
```

with the common execution machinery underneath them.

`draggable()` may therefore be an internal implementation primitive even though the kernel itself remains a supported advanced public layer.

**Attack:** is there real value in keeping `draggable()` public that cannot be provided cleanly through the kernel authoring API?

## 2. Sortable configuration vs features

The current API turns many ordinary configuration slots into branded features. This creates runtime collision/missing-feature validation and exposes composition machinery to every consumer.

The working direction is:

- ordinary built-in configuration → direct typed slots;
- genuinely substantial optional implementation → independently importable value/module;
- custom sortable extension → supported feature-authoring API.

For example, `onReorder`, `threshold`, `handle`, `visual`, etc. do not need to masquerade as unrelated feature objects merely to fit one composition mechanism.

This does **not** mean custom features disappear. It means first-party configuration need not be expressed as plugins just because third-party extension is supported.

The measured tree-shaking benefit is heavily concentrated in `landing()` and `layoutAnimation()`; most other current feature wrappers buy little code removal while still participating in the assembly architecture.

**Attack:** find cases where direct slots would make legitimate third-party extension materially worse, or where keeping a current first-party option as a feature buys something we have overlooked.

## 3. `destroy()`

Current synchronous, statement-level reentrant teardown is considered the clearest machinery magnet.

Working semantics:

```text
destroy requested
→ controller becomes logically closed immediately
→ no new work is admitted
→ if no library transaction is executing, teardown may complete immediately
→ if called reentrantly, physical teardown waits for the current synchronous
  library transaction to unwind
→ teardown happens exactly once
→ completion is observable/awaitable
```

A likely API is:

```ts
destroy(): Promise<void>
```

The important property is deferred **physical** teardown under reentrancy, not the Promise syntax itself.

The library would no longer promise that calling `destroy()` from inside an arbitrary consumer getter/accessor stops execution at precisely that statement. This is expected to remove most or all of the I-36 `live()`/barrier/reach/stretch machinery.

The contract should still prevent new work immediately and make stale asynchronous continuations inert.

**Attack especially hard:** cancellation, panic/failure, nested dispatch, retirement, or some other path may recreate the same mid-stack teardown problem even after `destroy()` changes. Determine whether the underlying rule must apply to all physical retirement, not only destruction.

## 4. Consumer contracts instead of runtime nannying

Several useful APIs should probably remain powerful while becoming less defensive.

### Placeholder

Keep a factory callback because arbitrary structured placeholders are a legitimate use case:

```ts
placeholder: (context) => HTMLElement;
```

Contract:

> Return a fresh detached element. The library assumes ownership until the operation ends.

Do not build production machinery to prove that the consumer complied. Returning the dragged item, a connected element, independently moving the placeholder, etc. is a contract violation.

Cheap development-only diagnostics may still be justified if they disappear completely from production.

### `visual()`

Keep `visual(item) => HTMLElement`.

A logical sortable item may intentionally have no box — e.g. a Web Component host using `display: contents`. `visual()` maps logical identity to the actual rendered box.

The same visual currently has coherent uses for:

- candidate geometry;
- placeholder sizing;
- lifted presentation;
- landing.

The working direction is simply:

```ts
const visual = resolveVisual(item);
const rect = visual.getBoundingClientRect();
```

and trust the resolver contract. Do not attempt to prove at runtime that the mapping is sensible.

Repeated resolution on geometry rebuild may actually be desirable because a framework can replace the internal rendered element while preserving the logical item.

**Attack:** find a real semantic reason candidate geometry and dragged presentation should resolve different boxes. Do not split them merely to remove a callback.

## 5. Custom landing runner

The current custom `landing({ run })` escape hatch is considered disproportionately expensive.

It publishes a lifecycle protocol around arbitrary consumer-owned animation resources: completion, failure, destruction, optional retargeting, provisional targets, transform relinquishment, etc. One independent review notes that this escape hatch alone brings several supporting public types and can weaken the final-position guarantee if the consumer does not relinquish control correctly.

Current preference:

```ts
landing({
  duration,
  easing, // cubic-bezier etc.
});
```

with the animation owned by the library.

Custom physics/spring runners are not considered important enough for the first stable API to justify the protocol.

`duration: () => number` should also have to justify itself independently.

**Attack:** identify a realistic product requirement that cannot reasonably be expressed with library-owned timing/easing and warrants reopening arbitrary runner ownership.

## 6. Collection semantics

The problem is no longer considered to be `updateItems()` itself. Explicit logical collection ownership can be useful.

The questionable guarantee is **live reconciliation/rebasing of an active operation across arbitrary collection changes**.

Working model:

```text
each operation uses one logical collection snapshot

updateItems(newItems):
  while idle    → replace collection
  while active  → invalidate/cancel current operation, then replace collection
```

No gap survival, rebasing, dense public version protocol, publish-before-cancel semantics, or elaborate reconciliation unless a real integration proves that one of them is needed.

The library does not need to infer mutation through `Object.is`, DOM observation, polling, etc. Calling `updateItems()` is the explicit notification that the logical collection changed.

Authored DOM movement caused by accepting the current reorder is not automatically a logical `updateItems()` event. The temporary drag presentation may coexist with the newly rendered DOM until the operation completes.

**Attack:** virtualization, collaboration, external reordering, and React concurrent behavior are the obvious places to look for cases where cancel-on-update is insufficient.

## 7. Reorder readiness / React commit

The current:

```text
accept({ presentation: true })
+
controller.ready(request)
+
readinessTimeout
```

grew from a much simpler DX problem: a React consumer needed a Deferred/Promise connecting `onReorder` with `useLayoutEffect`.

The working hypothesis is to return to **serial semantics**:

```ts
async onReorder(request) {
  setOrder(next);
  await authoredCommit;
  return accept();
}
```

Then:

```text
release
→ consumer work / React commit
→ accepted resolution fulfills
→ landing
→ cleanup
```

This removes the explicit readiness protocol, request-identity acknowledgement, readiness timeout, early/armed acknowledgement states, and the second settlement gate.

A React-specific helper may hide the Deferred bookkeeping if needed. The core protocol should not necessarily model a React layout commit as a state of the drag machine.

The cost is losing overlap between React commit latency and landing animation.

The earlier parallel protocol was built to avoid that serialization, but there is not yet evidence that the saved latency justifies its complexity. Both reviews identify the readiness machinery as expensive; Codex argues for collapsing it substantially.

**Attack especially hard:** prove whether committing the keyed authored DOM before landing can cause visual discontinuity, incorrect landing geometry, React interference with the lifted visual, or unacceptable latency. Reduced-motion/zero-duration landing is a useful falsifier.

## 8. Error and terminal API

The current fourteen exported numeric `FAILURE_*` constants expose internal pipeline decomposition and are undesirable both as compatibility surface and runtime exports.

Working direction:

```ts
class DraggableError extends Error {
  code: string-literal-union;
}
```

Potentially use a small stable consumer-level code set rather than one code per internal seam. Preserve the original exception through `cause`.

Transport is separate from representation:

- synchronous API misuse → `throw DraggableError`;
- failures occurring inside an event-driven operation → report the same error object through the operation's terminal channel.

A single exactly-once terminal callback is worth investigating:

```ts
onEnd(result);
```

with something like:

```ts
accepted | noop | rejected | canceled | failed;
```

instead of requiring consumers to duplicate end-of-operation handling across `onFinish`, `onCancel`, and `onError`.

The independent reviews both question the present failure/result taxonomy; one also notes that the public failure vocabulary is oddly richer than the cancellation vocabulary consumers are more likely to branch on.

**Attack:** identify useful consumer decisions that would be lost by coarser error codes or a unified terminal callback.

## 9. `ReorderRequest`

Current request/result structures carry indices, neighbour identities, snapshot versioning, and complete proposal/snapshot structures.

Much of this may be downstream of live reconciliation.

Do **not** redesign this independently yet. First settle collection semantics, then derive the minimum consumer-facing request from actual application needs.

Likely candidates are much smaller, e.g. an item plus indices or an insertion anchor, but no representation is chosen yet.

## 10. Input semantics remain open

The reviews raised two issues that have not yet been resolved:

- admitted `pointerdown` is `preventDefault()`ed before the activation threshold is crossed;
- keyboard ingress may capture arrow keys from editable/interactive descendants and currently shares assumptions with pointer handle policy.

These require executable browser/product probes rather than speculative API changes.

Do not bury them under the larger lifecycle rewrite.

---

## Things currently considered worth preserving

Unless contradicted by evidence:

- explicit accept/reject rather than inference;
- one immutable release proposal;
- operation identity for stale async work internally;
- pointer motion independent of framework rendering;
- reusable kernel lifecycle for custom behaviors;
- supported custom behavior authoring through a lower-level kernel surface;
- supported custom sortable features through an advanced feature-authoring surface;
- `visual()` as logical-item → rendered-box mapping;
- custom placeholder factories under a simple ownership convention;
- `y()` and `xy()` as genuinely different insertion strategies;
- library-owned cubic-bezier landing;
- idempotent teardown and stale-continuation rejection;
- string-discriminated public results.

---

## Review task

Attack this synthesis rather than refining it.

Look for:

- useful consumer capabilities we accidentally remove;
- complexity merely moved from the library to every consumer;
- assumptions that fail under React/concurrent rendering, Web Components, `display: contents`, virtualization, custom behaviors, or custom sortable features;
- cases where a proposed convention is too weak to support a reliable library;
- machinery that remains even after the public guarantee supposedly disappears;
- places where we are again preserving or deleting something because of the current implementation rather than consumer need.

Prefer counterexamples and executable probes over alternative designs. A good result is allowed to say that a current mechanism was justified.