# 3. Feature composition and private feature state

## What this is, precisely

**Construction-time composition of a known, closed set of sortable seams.** It
is not an open plugin architecture, and describing it as one would be a
straightforward overclaim: every new semantic seam requires coordinated edits to
`SortableContribution`, `SortableSlots`, `assemble`, validation, the behavior's
call sites, the exports and the tests. Features cannot contribute controller
methods, and cannot contribute transactional frame state.

That closed world is the *point* — it is what buys direct slot calls, prebuilt
pipelines, no runtime descriptor interpretation, and honest tree-shaking. It is
not a supported third-party authoring or versioning contract, and nothing here
should be read as promising one.

## A feature is a function factory (D-12)

```ts
type SortableFeature = (context: FeatureContext) => SortableContribution;

type FeatureContext = Readonly<{
  realm: DOMRealm;
  root: HTMLElement;
  /**
   * Best-effort platform report. Deliberately **not** `fail(stage, error)`: a
   * feature closure created at construction cannot know which operation is
   * live, so letting it classify a failure would let a late continuation from
   * one operation settle another (§[02](02-kernel-behavior-contract.md)
   * §Failure classification). A synchronous throw inside a seam is caught and
   * classified by the kernel's driver at that seam's stage; a landing runner
   * that must fail an operation gets an attempt-scoped `fail` argument.
   */
  report(error: unknown): void;
}>;
```

It runs **once**, while a concrete behavior instance is being constructed, in
declaration order. It may create whatever private runtime it likes, capture that
runtime in the callbacks it returns, and hand back a plain object of named
contributions.

**A feature factory is externally inert**: it may allocate, but it may not
attach a listener, write the DOM, or acquire anything needing release. Every
acquisition happens inside a kernel-owned operation lifetime
(§[01](01-construction-ownership.md) §When construction itself fails).

```ts
function layoutAnimation(options?: LayoutAnimationOptions): SortableFeature {
  return (ctx) => {
    // private runtime — nobody else can name it, reach it, or type it
    const records = new Map<HTMLElement, DisplacementRecord>();
    const duration = options?.duration ?? 0;

    return {
      beforeInsertionMove: (view) => measure(records, view),
      afterInsertionMove: (view) => invertAndPlay(records, view, duration, ctx),
      retire: () => restoreAll(records),
    };
  };
}
```

Compare probe 1's installer, `(install: SortableInstall) => void`, where the
same feature called `install.beforeInsertionMove(...)`,
`install.afterInsertionMove(...)`, `install.retire(...)`. The behaviours are
equivalent. Three things favour the contribution object:

1. **The assembler can validate by key.** A single-writer collision is
   `if (slots.x !== null) throw`, checked with the full contribution in hand,
   so a diagnostic can name both features rather than only the second.
2. **Metadata is a field, not a method.** `threshold`, `axis`, and any future
   scalar a behavior needs from a feature is a plain property. The installer
   needed one method per scalar.
3. **The behavior never builds an installer object.** One less construction-time
   surface, and one less thing whose method set has to be kept in sync with the
   slot record it writes into.

What does *not* differ: multi-seam features work identically, ordering is
declaration order in both, and neither is interpretable at runtime.

**F-10.** Because each feature returns a differently-shaped literal, the
assembler's property reads are structurally polymorphic. This is construction
time, once per feature, and is recorded only so it is not mistaken for a
hot-path concern later.

## The contribution

One flat type, fixed key names, **no discriminator**. There is deliberately no
`type`, `kind` or `phase` field: a discriminator invites a runtime `switch`,
and the brief forbids exactly that.

```ts
type SortableContribution = Readonly<{
  /* single-writer slots */
  insertion?: InsertionGeometry;
  createPlaceholder?: PlaceholderFactory;
  getHandle?: (item: HTMLElement) => HTMLElement | null;
  getVisual?: (item: HTMLElement) => HTMLElement;
  startLanding?: LandingStart;
  callbacks?: SortableCallbacks;

  /* multi-writer pipelines */
  beforeInsertionMove?: DisplacementHook;
  afterInsertionMove?: DisplacementHook;
  /** Run in **reverse** installation order — see §Assembly. */
  retire?: () => void;
}>;
```

There is no `threshold` metadata field. It lives in exactly one
consumer-facing place, `SortableCallbacks`, and `callbacks()` is what normalizes
the default (review 4, §30). Carrying it in two places invited the question of
which one wins.

### Geometry is a paired capability, not a lone read

```ts
type InsertionGeometry = Readonly<{
  resolve(frame: InsertionFrameView, runtime: InsertionRuntimeView): Insertion | null;
  /** The behavior's only way to say "the geometry you cached is stale". */
  invalidate(): void;
  retire(): void;
}>;
```

An earlier draft contributed only `resolveInsertion`, while the lifecycle called
`rects.markDirty()` directly from behavior code at activation, at every
placeholder move, on scroll/resize and at release (review 4, §1). `rects` is
private to `vertical()` and reachable by nobody, so that could not compile — and
omitting the calls instead would let scroll, resize, collection replacement,
placeholder movement and release all search stale geometry.

Pairing the three operations in one contribution means a single claim, a single
diagnostic naming both offending features, and no way to install a resolver
without its invalidator. The assembler **flattens** the pair into two direct
slot fields, so the call sites stay one property read and one call:
`slots.resolveInsertion(...)`, `slots.invalidateInsertion()`.

## Assembly (D-12, H-5)

The compiled version of everything below is in
[`packages/drag/docs/contract-probe-2/contract.ts`](../../../../packages/drag/docs/contract-probe-2/contract.ts).

```ts
const claim = <T>(current: T | null, next: T | undefined, label: string): T | null => {
  if (next === undefined) { return current; }
  if (current !== null) {
    throw new TypeError(`sortable: ${label} contributed by two features`);
  }
  return next;
};

function assemble(
  features: readonly SortableFeature[],
  ctx: FeatureContext,
): SortableSlots {
  let insertion: InsertionGeometry | null = null;
  let callbacks: SortableCallbacks | null = null;
  /* … the remaining single-writer locals … */
  const beforeMove: DisplacementHook[] = [];
  const afterMove: DisplacementHook[] = [];
  const retireHooks: Disposer[] = [];

  try {
    for (const feature of features) {
      const c = unbrandFeature(feature)(ctx);

      // Cleanup is recorded FIRST, before any claim can throw.
      if (c.insertion) { retireHooks.push(c.insertion.retire); }
      if (c.retire)    { retireHooks.push(c.retire); }

      insertion = claim(insertion, c.insertion, 'insertion geometry');
      callbacks = claim(callbacks, c.callbacks, 'callbacks');
      /* … the remaining single-writer claims … */
      if (c.beforeInsertionMove) { beforeMove.push(c.beforeInsertionMove); }
      if (c.afterInsertionMove)  { afterMove.push(c.afterInsertionMove); }
    }

    if (insertion === null) { throw new TypeError('sortable: vertical() is required'); }
    if (callbacks === null) {
      throw new TypeError('sortable: callbacks({ onReorder }) is required');
    }
    if (typeof callbacks.onReorder !== 'function') {
      throw new TypeError('sortable: onReorder must be a function');
    }
  } catch (error) {
    // §13 unwind: a later factory or validation failing must not leak an
    // earlier feature's state.
    for (let i = retireHooks.length - 1; i >= 0; i -= 1) {
      try { retireHooks[i]!(); } catch (nested) { ctx.report(nested); }
    }
    throw error;
  }

  retireHooks.reverse();                 // release in reverse acquisition order

  return {
    resolveInsertion: insertion.resolve,       // ← the pair, flattened
    invalidateInsertion: insertion.invalidate,
    onReorder: callbacks.onReorder,
    onStart: callbacks.onStart ?? NOOP_START,  // ← normalized; see below
    onFinish: callbacks.onFinish ?? null,
    onCancel: callbacks.onCancel ?? null,
    onError: callbacks.onError ?? null,
    threshold: callbacks.threshold ?? DEFAULT_THRESHOLD,
    /* … the remaining optional slots, `null` when unfilled … */
    beforeMove, afterMove, retireHooks,
  };
}
```

**The contribution objects are dropped.** The assembler must not retain the
feature array, the contribution array, or any reference to either. After
`assemble()` returns, the only things that exist are the slot fields and the
closures they hold — the features themselves are garbage.

**Two normalization rules, because "optional callback" is not one thing:**

- `onStart` is normalized to a **shared module-level no-op**, so the call site is
  `slots.onStart(item)` with no null check. It takes an argument the behavior
  already has.
- `onFinish`, `onCancel` and `onError` stay **nullable and null-checked**,
  because their arguments are result objects that would otherwise be constructed
  only to be discarded.

**Retire hooks run in reverse installation order**, and each is wrapped
individually so one throwing hook cannot stop later hooks from restoring their
DOM (review 4, §12). Reverse is the natural ownership order when hooks release
resources acquired in declaration order; the kernel's outer try/catch around
`spec.retire()` is a backstop, not a substitute.

**Cleanup is recorded before any claim runs, in installation order, and the
list is reversed exactly once.** Two separate bugs made this ordering subtle:

- Appending the axis feature's `insertion.retire` *after* the loop put it last
  in installation order and therefore **first** after the reverse — the opposite
  of the documented order for the common `[vertical(), layoutAnimation()]`
  composition (review 5, §10).
- Recording it *after* the claim leaked the private state of the very
  contribution whose claim collided: a second axis feature has already allocated
  its rect index when `claim` throws, and the unwind only saw earlier
  contributions (review 6, §16).

Recording both hooks immediately after the factory returns fixes both. Factories
are externally inert, so this is a retention and diagnostics concern rather than
a DOM leak — but the stated unwind should be total, not nearly total.

```ts
type SortableSlots = Readonly<{
  /* required, filled by the axis feature */
  resolveInsertion: InsertionGeometry['resolve'];
  invalidateInsertion: InsertionGeometry['invalidate'];

  /* required, filled by callbacks() */
  onReorder: OnReorder;
  onStart: (item: HTMLElement) => void;      // normalized, never null

  /* optional; `null` when no feature filled them */
  createPlaceholder: PlaceholderFactory | null;
  getHandle: ((item: HTMLElement) => HTMLElement | null) | null;
  getVisual: ((item: HTMLElement) => HTMLElement) | null;
  startLanding: LandingStart | null;
  onFinish: ((result: SortableFinishResult) => void) | null;
  onCancel: ((result: SortableCancelResult) => void) | null;
  onError: ((error: unknown, context: DragErrorContext) => void) | null;

  /* prebuilt pipelines, empty arrays when nothing installed */
  beforeMove: readonly DisplacementHook[];
  afterMove: readonly DisplacementHook[];
  retireHooks: readonly Disposer[];

  threshold: number;
}>;
```

Validation runs once and throws `TypeError`:

| Rule | Message shape |
| --- | --- |
| A required slot is unfilled | `sortable: vertical() is required` / `sortable: callbacks({ onReorder }) is required` |
| A single-writer slot is written twice | `sortable: insertion geometry contributed by two features` |
| `onReorder` is not a function | `sortable: onReorder must be a function` |

## Hot-path shape

```ts
// permitted — a direct field read and call
const resolved = slots.resolveInsertion(draft, rt.view);

// permitted — a prebuilt, usually empty, fixed array, never on the move path
for (let i = 0; i < slots.beforeMove.length; i += 1) { slots.beforeMove[i]!(view); }

// forbidden
for (const feature of features) { feature.onEvent(event); }
features.filter((f) => f.type === 'geometry');
```

The pipelines are arrays because more than one feature may legitimately occupy
them. They are fixed-length after assembly, empty in the minimal composition,
and are touched only around a committed placeholder move — never per pointer
move.

## Consumer-declared views, not producer projections (D-13)

Probe 1 typed feature seams as `Pick<SortableRuntime, 'current' | 'realm' | …>`.
That works, but it points the dependency the wrong way: `vertical.ts` has to
import the behavior's aggregate runtime type in order to describe what it needs.

Probe 2 inverts it. **A feature declares a minimal structural type in its own
module.** The behavior's runtime happens to satisfy it. Same physical object, no
allocation, no import edge from feature to behavior runtime, and the feature is
independently typeable and independently unit-testable against a literal.

**Frame state and runtime state are separate arguments**, because they have
separate owners and separate lifetimes:

```ts
// vertical.ts — imports no runtime type from the behavior
type InsertionFrameView = Readonly<{
  insertion: Insertion | null;
  pointerY: number;
}>;

type InsertionRuntimeView = Readonly<{
  snapshot: CollectionSnapshot;
  placeholder: HTMLElement;
}>;

// on InsertionGeometry
resolve(frame: InsertionFrameView, runtime: InsertionRuntimeView): Insertion | null;
```

```ts
// layout-animation.ts
type DisplacementView = Readonly<{
  realm: DOMRealm;
  snapshot: CollectionSnapshot;
  placeholder: HTMLElement;
}>;
```

An earlier draft declared a single `InsertionView` carrying a `current` frame
property, and claimed one stable per-controller object satisfied every view with
no materialization. **That was not constructible** (review 4, §2). The kernel
owns the swappable `current`/`draft` references exclusively and hands frames out
only as arguments, so nothing the behavior holds can expose an up-to-date
`current` property — not without stashing a kernel frame reference, mutating an
adapter per call, or allocating a view per call, each of which contradicts a
stated property. It also duplicated `pointerY` as both a view field and a
separate parameter, and `action.prepare` receives `draft`, not `current`, so the
sketch's `current.pointerY` read was wrong on its own terms.

Passing the two separately costs nothing and is honest about both:

- **The frame argument is the frame the kernel already handed the seam.**
  `Draft<Part>` and `Readonly<Frame<Part>>` both satisfy `InsertionFrameView`
  structurally, with no wrapper. A `prepare` passes its `draft`; nothing has to
  reach for `current`.
- **The runtime argument is one small `PresentationView` per operation**, created
  in `activation.effect` and cleared at retire. It exists because both feature
  views need a **non-null** `placeholder`, which a controller-lifetime runtime
  cannot promise before activation. Its `snapshot` is rewritten by
  `action.effect(COLLECTION)`. Two writes per operation, none per call, and no
  feature has to guard a null it can never see.

No view materialization on any path, no `Pick<>` anywhere, and no import edge
from a feature to the behavior's runtime type. This is what makes H-6 work at the
*runtime* level, the same way §[04](04-frame-slicing.md) makes it work at the
frame level.

## Private feature state, and what it answers

Probe 1's open question **Q-5** asked whether the packed geometry cache belongs
on the shared runtime — where retirement can empty it uniformly, at the cost of
leaking an axis-specific concept into a shared container — or inside
`vertical()`, which would require a feature-owned retirement hook.

Under H-4 the question does not arise. `vertical()` owns `rects`; the `retire`
contribution is how it gets emptied; and no shared container exists to leak
into. The cost is exactly one entry in `slots.retireHooks`.

| Feature | Private runtime | Escapes via |
| --- | --- | --- |
| `vertical()` | packed `Float64Array` rect index (stride 6) + parallel element array + dirty flag + last-seen collection version | `invalidate` marks it dirty; `retire` empties the element array and marks dirty |
| `layoutAnimation()` | `Map<HTMLElement, DisplacementRecord>` | `retire` restores every touched element exactly once |
| `landing()` | timing options, the WAAPI animation or the custom runner's handle | the `LandingHandle.destroy()` the kernel already holds |
| `placeholder()` | the factory and the class/attribute policy | nothing to release |
| `handle()`, `visual()` | none — pure resolvers | — |
| `callbacks()` | none — the consumer's functions | — |

Nothing here is reachable from the behavior, the kernel, or another feature.

## Feature-owned frame state — reserved, not implemented (D-10)

Everything above is *non-transactional* private state. `SortableContribution`
has no member for frame fields, and the kernel has no fold for them: it composes
each frame from exactly two sources, its own literal and the behavior's part
(§[04](04-frame-slicing.md) §Composition). **A feature cannot contribute
transactional state in the first iteration.**

That is a narrowing, not a prohibition on principle. D-10 originally forbade
feature frame parts on the grounds that they would force an aggregate type and
break the hidden-class guarantee; both were wrong. The reason none exists is
simpler: a frame field is committed state, so only a `prepare` may write it —
and both pipelines here (`beforeInsertionMove`, `afterInsertionMove`) run in
`action.effect`, post-commit. Admitting feature frame state would mean designing
a prepare-phase pipeline as well. Neither is built, because no feature needs
either, and building them anyway is the speculative generality the brief
forbids.

## First-iteration features

```ts
vertical(): SortableFeature;                                  // required
callbacks(options: SortableCallbacks): SortableFeature;       // required
placeholder(options?: PlaceholderOptions): SortableFeature;
handle(resolve: (item: HTMLElement) => HTMLElement | null): SortableFeature;
visual(resolve: (item: HTMLElement) => HTMLElement): SortableFeature;
layoutAnimation(options?: LayoutAnimationOptions): SortableFeature;
landing(options?: LandingOptions): SortableFeature;
```

### `vertical()`

The only module containing axis geometry. A future `horizontal()` is a sibling,
never a branch inside this one.

```text
candidates := centres of every non-dragged item, plus the placeholder's own centre
nearest    := the candidate whose centre is closest to the pointer on the Y axis
if nearest is the placeholder  -> keep the current insertion (no change)
else  gap := follows(placeholder, nearest) ? slot + 1 : slot
```

The placeholder being a candidate *is* the hysteresis: a new gap is proposed
only once another item's centre is genuinely closer than the placeholder's own
slot. No dead band, no direction latch, no tunable — which is why the rule
cannot be mistuned into oscillation. The current insertion stays authoritative
until a genuinely better one is selected; a frame resolving to `null` commits
nothing.

The rect index is marked dirty through `invalidate()` — called by the behavior
at activation, on scroll and resize, after a committed placeholder move, on
collection publication, and at release — and independently when the snapshot's
version moves. A refresh rebuilds only when one of those holds, so a frame's
search is one scalar scan.

**`invalidate()` is the whole reason geometry is a paired capability.** The
behavior owns the events that make geometry stale; the feature owns the cache.
Neither can do the other's half.

### `callbacks()`

```ts
type SortableCallbacks = Readonly<{
  onReorder: OnReorder;              // required
  onStart?(item: HTMLElement): void;
  onFinish?(result: SortableFinishResult): void;
  onCancel?(result: SortableCancelResult): void;
  onError?(error: unknown, context: DragErrorContext): void;
  threshold?: number;
}>;
```

One feature, because these are one coherent consumer surface and splitting them
buys no tree-shaking — a `null` check on an uninstalled callback costs nothing.

Acceptance is never inferred: not from callback silence, not from DOM mutation,
not from collection order, not from elapsed time, not from React eventually
rendering something.

```ts
type OnReorder = (
  request: ReorderRequest,
  context: Readonly<{ signal: AbortSignal }>,
) => MaybePromise<ReorderResolution>;

declare const ReorderResolution: Readonly<{
  accept(presentationReady?: PromiseLike<void>): AcceptedReorderResolution;
  reject(reason?: unknown, presentationReady?: PromiseLike<void>): RejectedReorderResolution;
}>;
```

`presentationReady` is **returned, not awaited**. Awaiting it inside `onReorder`
would serialize the consumer's render ahead of the landing animation instead of
overlapping it — which is the whole point of two independent gates.

### `placeholder()`

The behavior always creates a placeholder; this feature only customises it. It
is a *customisation* feature, which its name under-communicates — an inherited
wart from probe 1, kept because renaming it to `placeholderStyle()` reads worse
at the call site.

Default mechanics, always present and not configurable away: the element
occupies exactly one insertion position, carries `data-drag-placeholder` and
`aria-hidden="true"`, inherits the item's `slot`, and is sized from the visual's
**offset** box (unaffected by the item's transform or ancestor zoom). Beyond that
the library writes no visual styling.

The placeholder is the dragged item's authoritative layout footprint for the
whole operation: created detached during `activation.prepare`, inserted as a
post-commit effect, never duplicated or lost, valid while the lifted visual is
landing, released only when both gates are complete.

**It is a physical footprint, not a semantic one.** The React probe established
that React neither detaches nor repositions the injected placeholder, but that
an authored commit inserting a *new keyed item* into the destination gap can
leave it on the wrong side of the dragged item. The semantic anchor after
readiness is therefore the **item**, and the behavior repairs the placeholder
against it (D-16, §[05](05-lifecycle-invariants.md) F-15):

```ts
if (
  item.isConnected
  && item.parentElement === placeholder.parentElement
  && placeholder.nextElementSibling !== item
) {
  item.before(placeholder);
}
```

Each conjunct is load-bearing:

- **`nextElementSibling !== item`** — `Node.before()` on an already-correct
  position is a remove-and-reinsert, which resets CSS transitions on the
  placeholder and forces a reflow on every settlement.
- **`isConnected` and matching parents** — a consumer that unmounts or re-keys
  the dragged item as part of applying the reorder can leave `item` detached, or
  attached inside a different tree. Calling `before()` on it would then move the
  **placeholder** into that tree, destroying the very element the fallback
  measures (review 4, §16). The guard turns an anchor loss into a degraded but
  safe measurement instead of a detached placeholder.

When the guard fails, the behavior measures the still-connected placeholder
where it stands. **This is the normative fallback**, not an open choice: Q-12
remains open only on whether a fixture ever shows it insufficient
(§[05](05-lifecycle-invariants.md)).

### `landing()`

```ts
type LandingOptions = Readonly<{
  duration?: number;
  easing?: string;
  /** Full replacement for the default WAAPI runner — a spring, for example. */
  run?: LandingStart;
}>;
```

Without this feature the behavior holds no landing gate and no landing module is
imported. The visual is pinned at the placeholder **in the same drain only when
the readiness gate is also open** — an accepted resolution carrying a
`presentationReady` promise still holds settlement open, because the two gates
are independent in both directions (I-8, I-9). With
`duration: 0` the gate is held and released through the runner — also immediate,
but not the same code path, and the default path does not import the runner.

`landing({ duration, easing })` installs a Web Animations runner honouring
`prefers-reduced-motion` by collapsing duration to zero. `landing({ run })`
replaces it entirely; a spring driving `requestAnimationFrame` and calling
`done()` when it settles is a first-class citizen, because nothing in the
contract assumes a CSS timing function or a finite known duration.

**Synchronous completion is explicitly supported.** A `duration: 0` runner, or a
custom runner that decides it has nothing to do, may call `done()` or `fail()`
from inside `start` before returning a handle. The kernel makes that safe by
reserving the hold *before* calling `start` and publishing the returned handle
before any queued completion can be applied
(§[02](02-kernel-behavior-contract.md) §Request, seal, then arm). A completion
is latched once: a second `done()`, or a `done()` after a `fail()`, is inert.

**A runner is never responsible for correctness.** The `target` in its context
is provisional; the kernel measures again at the join and performs the
authoritative pin through the lift session (D-16). A runner's only obligations
are to call `done()`/`fail()`, and to relinquish the visual's transform on
`destroy()` so the pin is not overridden — for a WAAPI runner, `animation.cancel()`.

`retarget?(target)` is optional and improves trajectory quality only. A runner
that omits it is fully correct; one that implements it turns a late readiness
correction from a step into a smooth adjustment
(§[05](05-lifecycle-invariants.md) F-16).

### `layoutAnimation()`

Two seams bracket the single placeholder-move writer:

```text
slots.beforeMove[…]      measure current rects
placeholder DOM move     the sole writer of placeholder position
slots.afterMove[…]       re-measure, write inverted transforms, play
```

The library performs only the measurements and temporary transform writes that
make CSS animation possible; duration and easing are the consumer's, through
CSS. FLIP is the expected implementation, not a requirement.

**It is not a lifecycle gate, and under D-7 it structurally cannot become one:**
it has no access to `SettlementScope`, which is passed only to
`settlement.effect`. An in-flight displacement never delays release, settlement
or presentation teardown. This is a case where probe 2 turns a probe-1 *rule*
into an absence of capability.

Retargeting: a placeholder move while a previous displacement is running cancels
it and replays from the element's current *computed* transform, not from its
authored origin. A displacement completion carries no operation identity because
it can affect nothing outside the feature's own element map; retirement empties
that map, so a late completion finds nothing to write.

**Open cost, not yet measured.** `vertical()` rebuilds its rect index around the
same placeholder move that `layoutAnimation()` brackets with its own before/after
measurements, so a committed move can force two independent full-list layout
reads. For a large list those reads plausibly dominate frame copy, callback
overhead and everything else this document counts. Q-7 (which elements the
displacement set contains) must be settled and the minimal affected set measured
**before implementation sign-off**. If both features genuinely need the same
pre-move rects, a behavior-owned read phase or a small shared geometry-read
capability is the answer — duplicating a full-list measurement to preserve
conceptual privacy would be the wrong trade.

## The collection model

```ts
type CollectionSnapshot = Readonly<{
  items: readonly HTMLElement[];
  version: number;
}>;
```

The published snapshot lives on the behavior's private runtime, not in a frame:
it is replaced wholesale, never mutated, and `updateItems()` shallow-copies the
caller's array so a queued snapshot cannot be changed by a later caller
mutation. The frame holds the snapshot the *current operation* is reasoning
about, which may lag the published one by at most one queued action.

`reconcileCollection` is pure and identity-based, ported unchanged:

- an **internal** gap survives only when `before` and `after` remain present and
  adjacent in the destination view;
- a **start** gap survives only when `after` remains the first destination item;
- an **end** gap survives only when `before` remains the last destination item;
- otherwise the operation cancels with `CANCEL_COLLECTION_INVALIDATED`, or with
  `CANCEL_ITEM_REMOVED` if the dragged item itself vanished.

Intent is **never** recomputed from the latest pointer position. The exact
identity gap survives or the operation ends.

**Publication is an effect, not a preparation.** `prepare` stages a
`PreparedCollection` and writes only the draft; `effect` publishes `rt.snapshot`
and `rt.view.snapshot` and calls `slots.invalidateInsertion()`. An earlier draft
published from `prepare` and returned `false` — which does not typecheck against
`{} | null`, and, more seriously, meant a reentrant cancel or destroy could
invalidate the preparation after the private runtime had already been replaced
(review 4, §4).

**The action never discards, and it branches by phase.** Both matter: discarding
loses the consumer's update (§[02](02-kernel-behavior-contract.md) §An
invalidating collection replacement must not be lost), and *not* branching means
`draft.snapshot` gets rewritten in every phase — which retains item elements in
an idle frame against I-20, and rewrites the very transaction snapshot the
release path froze.

| Phase | `prepare` stages | Binds `draft.snapshot`? | `effect` |
| --- | --- | --- | --- |
| `IDLE` | The snapshot. | **No** — an idle frame must retain no DOM (I-20). | Publish. |
| `PENDING` | The snapshot. `cancelReason` if the pressed item vanished. | Yes | Publish. |
| `ACTIVATING` | Same as `ACTIVE`. | Yes | Publish; invalidate geometry; cancel last if staged. |
| `ACTIVE` | The snapshot plus the rebased insertion, written into the draft. `cancelReason` when the gap cannot survive. | Yes | Publish; invalidate geometry; cancel last if staged. |
| `RELEASING`, `SETTLING`, `REPORTING`, `FINALIZING` | The snapshot only. | **No** — the operation's semantic snapshot is frozen and the transaction is decided. | Publish. |

A commit for a phase whose frame fields did not change is a no-op swap of two
identical frames — one `Object.assign` on a path that already replaces a
collection. Paying it uniformly is what keeps "a discarded action touched
nothing" true without a per-phase exception.

### `ACTIVATING` is handled, not deferred

An earlier draft said an update arriving during `ACTIVATING` was "queued behind
the activation checkpoint and applied as `ACTIVE`". **That cannot be obtained
from FIFO** (review 5, §5): `activation.effect` calls `onStart` *before* the
kernel dispatches `START_COMMITTED`, so an `updateItems()` from inside `onStart`
is appended **first** and FIFO requires it to run first — while the phase is
still `ACTIVATING`. Getting the documented behavior would have needed a pending
slot, an explicit requeue with an anti-spin bound, or a reordering of the
activation checkpoint.

None of those is needed, because **the deferral itself is unnecessary now**.
I-30's post-commit ordering already guarantees that `rt.placeholder`, `rt.lift`
and `rt.view` are published *before* `onStart` runs, and the home insertion is
committed. An `ACTIVATING` frame is therefore as reconcilable as an `ACTIVE`
one, so the collection action treats the two identically and the deferral, the
pending slot and the requeue rule all disappear.

`onStart` calling `updateItems()` is an executable case in the test matrix, not
a derivation.

**And the invalidating case needs one explicit rule**, because "the cancel
transition runs next" is *not* true in this reentrant ordering (review 6, §14).
The FIFO sequence is: `onStart` queues the collection action → activation
returns and queues `START_COMMITTED` → the collection effect publishes and
queues `CANCEL`. `START_COMMITTED` is already ahead of `CANCEL`.

**The rule: `host.cancel` latches synchronously.** The kernel's cancel latch is
set the moment `host.cancel` is called, not when the `CANCEL` action is applied,
and `START_COMMITTED` checks it — so an operation cancelled during `ACTIVATING`
never reaches `ACTIVE`. This is the existing I-21 latch ("first valid cancel per
operation wins", kernel-private) doing exactly what it was built for; what was
missing was saying that `START_COMMITTED` consults it.

The alternative — activate, then cancel immediately afterwards — would be
defensible only if nothing observable happened in between, and `START_COMMITTED`
is a phase commit that later actions branch on.

**The checkpoint defers; it does not retire.** Refusing to advance leaves the
phase at `ACTIVATING`, and the `CANCEL` queued behind it settles there — which
is what delivers the single terminal callback
§[02](02-kernel-behavior-contract.md) §I-31 requires. Retiring from the
checkpoint instead would race the cancellation to the same operation and swallow
it.

## Tree-shaking

Judged through consumer fixtures, not source intuition.

1. No global registry, no barrel that eagerly references every feature, no
   default options object naming an optional feature.
2. Each feature is its own module with no import edge to a sibling feature, and
   no import edge to the behavior's runtime type (D-13 removes the last one).
3. The behavior reaches optional capabilities only through `slots.x` fields that
   are `null` when unfilled — never through a default implementation imported at
   the top level.

### The minimal fixture, exactly

```ts
sortable(items, vertical(), callbacks({ onReorder }))
```

**A minimal vertical sortable necessarily contains vertical axis geometry.** An
earlier draft required "axis geometry" to be absent from the minimal build while
also making `vertical()` required — an impossible target (review 4, §24). What
the brief actually requires absent is *unselected* geometry and unselected
optional work (`brief.md:615-637`):

| Must be absent from the minimal build |
| --- |
| horizontal and grid axis implementations |
| free drag |
| layout displacement (`layoutAnimation`) |
| landing animation (`landing`, and the WAAPI runner) |
| any input mode other than pointer |

The four compositions to measure: minimal; minimal + `layoutAnimation()`;
minimal + `landing()`; the complete set.

### The export topology this requires

A separate subpath entry per optional feature is what makes the measurement
honest: the minimal fixture's import graph physically cannot reach geometry it
did not import, independent of bundler heuristics. The shipped package exposes
only `draggable.js` and `sortable.js` (`packages/drag/files.json`,
`packages/drag/package.json:15-24`), so this is a new topology and has to be
written down before it is measured, or ergonomics will quietly reintroduce an
eager barrel.

| Subpath | Runtime exports | Type exports |
| --- | --- | --- |
| `drag.js` | `draggable` | `Point`, `DragErrorContext`, `FailureStage`, `DOMRealm`, `Behavior` (opaque) |
| `sortable.js` | `sortable`, **`ReorderResolution`** | `ReorderRequest`, `ReorderProposal`, `ReorderResolution`, `SortableFinishResult`, `SortableCancelResult`, `CancelStage`, `SortableController`, **`SortableFeature`** (opaque) |
| `sortable/vertical.js` | `vertical` | — |
| `sortable/callbacks.js` | `callbacks` | `SortableCallbacks`, `OnReorder` |
| `sortable/placeholder.js` | `placeholder` | `PlaceholderOptions` |
| `sortable/handle.js` | `handle`, `visual` | — |
| `sortable/landing.js` | `landing` | `LandingOptions`, `LandingStart`, `LandingContext`, `LandingHandle` |
| `sortable/layout-animation.js` | `layoutAnimation` | `LayoutAnimationOptions` |

**`ReorderResolution` is a runtime export as well as a type** (review 6, §10).
The documented consumer calls `ReorderResolution.accept(…)` and
`ReorderResolution.reject(…)`, the shipped package exports the same factory, and
listing it under types only would have made every example in these documents
fail to run. The name is deliberately both a value and a type, as it is today.

Three decisions the earlier table left open (review 5, §12):

- **`draggable` moves to its own `drag.js` entry.** It is behavior-agnostic, so
  putting it under `sortable.js` would make a future free-drag consumer import
  the sortable behavior to reach it. The shipped `draggable.js` entry is
  replaced, not kept alongside.
- **`SortableFeature` is declared in `sortable.js`** and re-exported nowhere.
  Every feature subpath imports it type-only from there, which gives the shared
  type one resolvable identity across separate declaration files instead of a
  structurally-equal duplicate per subpath.
- **Every runtime entry above becomes a `files.json` entry.** Shared contract
  *types* are imported type-only, so they contribute no runtime edge, but they
  still need the declaration files to resolve — which is why the identity
  question above is not cosmetic.

The exact import statements for each measurement fixture are part of M-3, not of
this table.

### The public/internal boundary

The brief asks for this and the earlier draft did not state it.

**Internal and unstable** — not exported, and free to change without notice:
`BehaviorSpec`, `KernelHost`, `Transition`, `ReleaseTransition`,
`SettlementTransition`, `ActionTransition`, `SettlementInput`, `SeamOutcome`,
`SeamRejection`, `ArmOutcome`, `ActivationScope`, `SettlementScope`,
`LifetimeScope`, `FeatureContext`, `SortableContribution`, `SortableSlots`,
`InsertionGeometry`, and the phase/lift/outcome/recovery constants.

**Public and stable:** everything in the table above, plus the `FailureStage`
and `CancelStage` constants — a consumer receiving `onError` or a canceled
result has to be able to discriminate them, so keeping them internal while
embedding them in public types was the same contradiction as the feature type.

`SortableFeature` and `Behavior` are public **as opaque value types**: nameable
and passable, not constructible.

#### Closed for real: the feature value is opaque

Two earlier attempts at this boundary were both incoherent, in opposite
directions.

The first said "only built-ins may author" while exporting nothing to enforce
it — and TypeScript accepts a structurally matching function literal whether or
not a type name is exported (review 5, §12). The second admitted that and
exported `SortableFeature` as *public and stable* while keeping
`FeatureContext` and `SortableContribution` *internal and unstable*. That is not
a third state, it is a contradiction (review 6, §11): `SortableFeature` was
**defined** as a function between the two unstable types, so any change to
either changed the public type's assignability and its emitted declaration.
Accepting it in public `sortable()` made the whole authoring shape a semver
surface regardless of the "unsupported" label.

**The feature value is now opaque.**

```ts
declare const FEATURE_BRAND: unique symbol;
type SortableFeature = Readonly<{ [FEATURE_BRAND]: true }>;
```

A consumer can hold a feature, name its type, and pass it to `sortable()`. It
cannot construct one, because the brand is unexported. The authoring types stay
genuinely internal, third-party authoring is *prevented* rather than
discouraged, and the closed world the rest of this document depends on is real.
The brand is declaration-only and costs nothing at runtime. `Behavior` is opaque
by the same mechanism, for the same reason.

The same leakage was fixed in three other places by **exporting what the public
type structurally depends on** rather than pretending it is internal:
`FailureStage` (public — `onError` receives it and a consumer must switch on
it), `DOMRealm` (public — `LandingContext` carries it, and a custom runner needs
it), and `Point` (already public).

If feature authoring is ever supported, that is a deliberate decision to export
`FeatureContext` and `SortableContribution` under a versioning promise — not a
side effect of a type becoming reachable.

### What isolation cannot shake

Measure the fixed cost too, and compare it against a hand-written,
non-composed vertical sortable so the bundle claim is evidence rather than
import-graph intuition:

- every optional key in `SortableContribution`;
- every assembler property read and `claim` branch;
- the nullable slot fields and their null checks;
- the three always-present pipeline arrays.

That plumbing may well be entirely acceptable. It has not been weighed.

## Policy updates

The set of installed features is immutable after controller creation. A feature
may accept live policy updates only if it deliberately exposes them, and the
only supported way is for the *behavior* to add a controller method — a feature
does not contribute one.

This is a deliberate narrowing of probe 1, which allowed feature-contributed
controller methods. No first-iteration feature needs it, and admitting it would
put an unbounded string-keyed record into the contribution type. Recorded as an
extension point, not built.
