# 2. Behavior contract — `sortable()`

The sortable behavior supplies domain semantics to the kernel. It defines its own runtime and frame data, its collection and insertion model, the reorder request and result values, its controller methods, and the seam calls its features plug into. It does **not** own a queue, a phase machine, a cancellation latch or a resource-lifetime model.

## Signature

```ts
function sortable(
  items: readonly HTMLElement[],
  ...features: readonly SortableFeature[]
): DraggableBehavior<SortableController>;
```

`items` is behavior **state**, not a capability, so it is a positional argument rather than a feature: there is no build in which collection code is absent, and making it a feature would create a required feature that tree-shakes nothing. Everything that _is_ a capability goes through the varargs. (C-6)

The behavior is a closure over construction:

```ts
function sortable(items, ...features) {
  return (kernel) => {
    const runtime = extendRuntime(kernel.runtime, items); // C-3: in place
    const slots = assemble(features); // C-5
    kernel.install(createSortableSpec(runtime, slots));
    return createSortableController(kernel, runtime);
  };
}
```

Construction order is fixed: extend the runtime, assemble and validate features, install the spec, build the controller. No input can be admitted before `install()` returns, because the kernel arms its ingress listener from `install()`.

## The collection model

```ts
/** An immutable ordered snapshot of the collection and its version. */
type CollectionSnapshot = Readonly<{
  items: readonly HTMLElement[];
  version: number;
}>;
```

The published snapshot lives on the runtime container, not in a frame: it is replaced wholesale, never mutated, and `updateItems()` shallow-copies the caller's array so a queued snapshot can never be changed by a later caller mutation. The frame holds the snapshot the _current operation_ is reasoning about, which may lag the published one by at most one queued action.

### Collection changes during an operation (C-14)

`reconcileCollection` is pure and identity-based, ported unchanged:

- an **internal** gap survives only when `before` and `after` remain present and adjacent in the destination view;
- a **start** gap survives only when `after` remains the first destination item;
- an **end** gap survives only when `before` remains the last destination item;
- otherwise the operation cancels with `CANCEL_COLLECTION_INVALIDATED`.

Intent is **never** recomputed from the latest pointer position. The exact identity gap survives or the operation ends. If the dragged item itself disappears from the replacement, the operation cancels with `CANCEL_ITEM_REMOVED`.

Replacements are ignored from `RELEASING` onward — the transaction is decided.

| Phase | Response to `updateItems()` |
| --- | --- |
| `IDLE` | Publish the snapshot. No operation to reconcile. |
| `PENDING` | Publish; rebind the frame snapshot. Cancel if the pressed item vanished. |
| `ACTIVATING` | Deferred: the replacement is queued behind the activation checkpoint and applied as `ACTIVE`. |
| `ACTIVE` | Reconcile: rebase the insertion or cancel. Mark geometry dirty. |
| `RELEASING`, `SETTLING`, `REPORTING`, `FINALIZING` | Publish only. The operation's snapshot is frozen. |

## The insertion model

```ts
/** A proposed insertion gap within a destination view of one snapshot. */
type Insertion = Readonly<{
  version: number;
  index: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;
```

The _destination view_ is the snapshot minus the dragged item. Because it mirrors the DOM order of the non-dragged items, a gap index is directly a destination index and its neighbours are the adjacent elements — no placeholder move is needed to read them.

**The committed insertion is state.** It lives on the frame. Moving the placeholder is a _post-commit effect_ and the sole writer of the placeholder's DOM position. Nothing else in the package repositions it.

### The vertical rule (C-7)

Supplied by `vertical()`, which owns the packed geometry cache and the search.

```text
candidates := centres of every non-dragged item, plus the placeholder's own centre
nearest    := the candidate whose centre is closest to the pointer on the Y axis
if nearest is the placeholder  -> keep the current insertion (no change)
else  gap := follows(placeholder, nearest) ? slot + 1 : slot
```

The placeholder being a candidate _is_ the hysteresis: a new gap is proposed only once another item's centre is genuinely closer than the placeholder's own slot. There is no separate dead band, no direction latch and no tunable — which is why the rule cannot be mistuned into oscillation.

The current insertion stays authoritative until a genuinely better one is selected. A frame that resolves to `null` commits nothing.

**Geometry cache.** Every non-dragged item's rect is packed into one `Float64Array` (stride 6) with a parallel element array indexed by destination slot, so a frame's search is one scalar scan. It is marked dirty by scroll, resize, a committed placeholder move, a collection version change, and release. A refresh rebuilds only when dirty or when the version moved.

## Seam implementations

What the behavior does at each `KernelSpec` operation.

| Kernel seam | Sortable implementation |
| --- | --- |
| `createFrame` / `resetFrame` | `SortableStateFrame`; reset clears snapshot, insertion, proposal, domain. |
| `threshold` | From `callbacks()`/behavior config; default 8 px. |
| `liftMode` | `LIFT_FAITHFUL`. |
| `admit` | Resolve the pressed item against the published snapshot; apply the `handle()` slot if installed; write `item`, `visual` (via the `visual()` slot or identity), `snapshot`. |
| `activate` | Create and insert the placeholder (default mechanics, or the `placeholder()` slot); size it from the visual's offset box; register its removal on the presentation lifetime; seed the home insertion; mark geometry dirty; arm invalidation. |
| `notifyStart` | `slots.onStart?.(item)`. |
| `moved` | Bump `spatialSeq`, schedule the coalesced frame task. (The kernel already wrote the lift transform.) |
| `release` | Mark geometry dirty; re-resolve the insertion synchronously from the committed release point; fall back to the incumbent, then to the home insertion; build the immutable proposal; commit; move the placeholder; `kernel.resolve(slots.onReorder)`. A no-op proposal skips resolution and settles as `OUTCOME_NO_OP`. |
| `classify` | Map accept/reject to `ReorderTransactionResult`; write `domain`; return outcome + recovery (`DESTINATION` on accept, `HOME` on reject). |
| `startLanding` | Delegate to the `landing()` slot; `false` when absent. (C-9) |
| `notifyTerminal` | `onFinish` for accepted/no-op, `onCancel` for rejected/canceled, nothing for failed. |
| `retire` | Cancel the frame task, empty the geometry cache of element references, drop the placeholder reference, run feature `retire` hooks. |
| `handleAction` | Two tags: spatial frame, collection replacement. |

## Reorder request and results

```ts
/** A proposed reorder, carrying both indices and stable neighbour identity. */
type ReorderRequest = Readonly<{
  item: HTMLElement;
  version: number;
  from: number;
  to: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;
```

`from`/`to` are indices in the snapshot; `before`/`after` are identities so a consumer that keys by object rather than index is not forced to trust indices. `version` lets a consumer detect that it is applying a reorder derived from an older collection than the one it holds.

Exactly one immutable proposal is constructed per operation, at release, after motion is closed. Nothing queued before release may alter it.

```ts
type ReorderTransactionResult =
  | { type: OUTCOME_ACCEPTED; proposal }
  | { type: OUTCOME_REJECTED; reason: REORDER_REJECTION_CONSUMER; detail?: unknown; proposal }
  | { type: OUTCOME_NO_OP; proposal }
  | { type: OUTCOME_CANCELED; reason: CancellationReason; at: AT_PROPOSAL | AT_CONSUMER; proposal | null };
```

`at` distinguishes a gesture abandoned before a proposal was offered from one abandoned while the consumer was resolving it.

## Explicit resolution

```ts
type OnReorder = (
  request: ReorderRequest,
  context: Readonly<{ signal: AbortSignal }>,
) => MaybePromise<ReorderResolution>;

const ReorderResolution: {
  accept(presentationReady?: PromiseLike<void>): AcceptedReorderResolution;
  reject(
    reason?: unknown,
    presentationReady?: PromiseLike<void>,
  ): RejectedReorderResolution;
};
```

Acceptance is **never** inferred — not from callback silence, not from DOM mutation, not from collection order, not from elapsed time, not from React eventually rendering something. A fulfilled value that is not an explicit resolution is a classified failure, not a silent accept.

The `signal` is aborted when the operation is cancelled or destroyed while the resolver is still in flight, so an async consumer can abandon its own work. It is never aborted after the resolver has completed.

`presentationReady` is the consumer's authored-presentation barrier; see [artifact 6](06-readiness-landing.md).

## Controller

```ts
type SortableController = Readonly<{
  /** Replace the collection. Identity-based; shallow-copied at the boundary. */
  updateItems(items: readonly HTMLElement[]): void;
  /** Abandon the current operation. Idle cancel is a no-op. */
  cancel(reason?: unknown): void;
  /** Terminal. Synchronous. Releases everything before returning. */
  destroy(): void;
}>;
```

`cancel()` and `destroy()` come from the kernel unchanged; `updateItems()` is the behavior's own. The controller is the extension point: a behavior adds methods by adding fields here, and a feature that needs a public method contributes it through the installer rather than by wrapping the controller.

## What the behavior must not do

- reimplement the state machine, the queue, or the cancellation latch;
- own an independent queue or scheduler beyond the one coalesced frame task the kernel closes with motion ingress;
- write `phase` — only kernel lifecycle handlers do;
- publish anything before the kernel's commit point;
- iterate features at runtime, or filter them by kind on any path.