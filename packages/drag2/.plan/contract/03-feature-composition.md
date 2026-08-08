# 3. Feature composition and private feature state

## What this is, precisely

**Construction-time composition of a known, closed set of sortable seams.** It is not an open plugin architecture, and describing it as one would be a straightforward overclaim: every new semantic seam requires coordinated edits to `SortableContribution`, `SortableSlots`, `assemble`, validation, the behavior's call sites, the exports and the tests. Features cannot contribute controller methods, and cannot contribute transactional frame state.

That closed world is the _point_ — it is what buys direct slot calls, prebuilt pipelines, no runtime descriptor interpretation, and honest tree-shaking. It is not a supported third-party authoring or versioning contract, and nothing here should be read as promising one.

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

It runs **once**, while a concrete behavior instance is being constructed, in declaration order. It may create whatever private runtime it likes, capture that runtime in the callbacks it returns, and hand back a plain object of named contributions.

**A feature factory is externally inert**: it may allocate, but it may not attach a listener, write the DOM, or acquire anything needing release. Every acquisition happens inside a kernel-owned operation lifetime (§[01](01-construction-ownership.md) §When construction itself fails).

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

Compare probe 1's installer, `(install: SortableInstall) => void`, where the same feature called `install.beforeInsertionMove(...)`, `install.afterInsertionMove(...)`, `install.retire(...)`. The behaviours are equivalent. Three things favour the contribution object:

1. **The assembler can validate by key.** A single-writer collision is `if (slots.x !== null) throw`, checked with the full contribution in hand, so a diagnostic can name both features rather than only the second.
2. **Metadata is a field, not a method.** `threshold`, `axis`, and any future scalar a behavior needs from a feature is a plain property. The installer needed one method per scalar.
3. **The behavior never builds an installer object.** One less construction-time surface, and one less thing whose method set has to be kept in sync with the slot record it writes into.

What does _not_ differ: multi-seam features work identically, ordering is declaration order in both, and neither is interpretable at runtime.

**F-10.** Because each feature returns a differently-shaped literal, the assembler's property reads are structurally polymorphic. This is construction time, once per feature, and is recorded only so it is not mistaken for a hot-path concern later.

## The contribution

One flat type, fixed key names, **no discriminator**. There is deliberately no `type`, `kind` or `phase` field: a discriminator invites a runtime `switch`, and the brief forbids exactly that.

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

There is no `threshold` metadata field. It lives in exactly one consumer-facing place, `SortableCallbacks`, and `callbacks()` is what normalizes the default (review 4, §30). Carrying it in two places invited the question of which one wins.

### Geometry is a paired capability, not a lone read

```ts
type InsertionGeometry = Readonly<{
  resolve(
    frame: InsertionFrameView,
    runtime: InsertionRuntimeView,
  ): Insertion | null;
  /** "Stale." **Lazy by contract** — scroll and resize raise it constantly. */
  invalidate(): void;
  /** Optional. "Re-read **now**", in the one window that is safe to read in. */
  measure?(frame: InsertionFrameView, runtime: InsertionRuntimeView): void;
  retire(): void;
}>;
```

An earlier draft contributed only `resolveInsertion`, while the lifecycle called `rects.markDirty()` directly from behavior code at activation, at every placeholder move, on scroll/resize and at release (review 4, §1). `rects` is private to `vertical()` and reachable by nobody, so that could not compile — and omitting the calls instead would let scroll, resize, collection replacement, placeholder movement and release all search stale geometry.

Pairing the three operations in one contribution means a single claim, a single diagnostic naming both offending features, and no way to install a resolver without its invalidator. The assembler **flattens** the pair into two direct slot fields, so the call sites stay one property read and one call: `slots.resolveInsertion(...)`, `slots.invalidateInsertion()`, `slots.measureInsertion` (nullable).

### Insertion geometry is _settled presentation geometry_

The insertion rule resolves against where items **settle**, and settled presentation geometry is defined by what it includes and what it excludes:

- it **includes** authored element and ancestor transforms, and any visual offset the consumer's own code applies — those are real, and an item the page has moved really is somewhere else;
- it **excludes** every displacement offset the library itself owns.

The distinction is not academic. The axis rule reads with `getBoundingClientRect()`, which includes a running FLIP offset, and it refreshes lazily — so with `layoutAnimation()` installed it measured items where they no longer were while measuring the placeholder where it now is. That mixed field proposes moving back: the crossed row's animating centre is nearer the pointer than the placeholder's settled one, which re-commits, which re-animates. **A feature that only animates was changing what the drag decided**, and the hysteresis this document credits with having "nothing to mistune into oscillation" was defeated by composition rather than by tuning.

The rule is enforced by _when_ the read happens, not by asking the axis to compensate for something it must not know about:

```text
beforeMove   capture each owned element where it currently looks,
             then RELEASE every offset this feature applied
placeholder  the sole writer of placeholder position
invalidate   the axis cache is marked stale
measure      ← the axis rebuilds HERE: no library offset is applied anywhere
afterMove    re-measure, invert, play
```

Three consequences worth stating, because each was a candidate design that does not work:

- **The release must cover every element the feature is offsetting, not just this move's span.** During a fast drag an element from the previous move is still mid-flight, and one element still carrying an offset is enough to corrupt the rebuild. It is released and replayed from the position captured a moment earlier, so nothing snaps — no frame is painted inside an effect.
- **`invalidate()` cannot simply become eager.** Its other callers are the scroll and resize listeners, which must not read geometry. The two wants are opposite, which is why `measure()` is a second method rather than a stronger first one.
- **This is a re-timing, not a shared read phase.** A committed move always dirties the axis and the axis always rebuilds on the next spatial frame — by which time it is mid-animation. Moving that rebuild into the bracket adds no reads at all; it only makes them land in the window where they are correct.

**Release resolves against settled geometry too**, and it is the case that matters most: release re-resolves after motion closes, typically while the last committed move's displacement is still in flight, and what it produces is not an intermediate placeholder position but the `ReorderRequest` the consumer is asked to apply. A mid-flight reading there is a wrong reorder — or, when the wrong gap happens to equal the item's own index, no `onReorder` call at all.

`release.prepare` therefore runs the `beforeMove` pipeline before it measures. That pipeline already means _the placeholder is about to move, hand back what you are holding_, and `release.effect` does move it; the gap passed is the incumbent one, which is the honest best estimate before resolution supersedes it. `afterMove` is deliberately not run — release does not animate, and the drop lands on a list at rest.

This is a **deliberate, bounded exception to "prepare performs no DOM writes"**. What it writes is the release of temporary offsets the library itself applied: it publishes nothing, changes no tree, and leaves every row at the position it was already animating towards. Release cannot discard, and a failed release retires the operation — where the feature's own `retire` would cancel those animations anyway. The side effect is exactly what teardown would have done, one moment earlier.

## Assembly (D-12, H-5)

The compiled version of everything below is in [`packages/drag/docs/contract-probe-2/contract.ts`](../../../../packages/drag/docs/contract-probe-2/contract.ts).

```ts
const claim = <T>(
  current: T | null,
  next: T | undefined,
  label: string,
): T | null => {
  if (next === undefined) {
    return current;
  }
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
      if (c.insertion) {
        retireHooks.push(c.insertion.retire);
      }
      if (c.retire) {
        retireHooks.push(c.retire);
      }

      insertion = claim(insertion, c.insertion, 'insertion geometry');
      callbacks = claim(callbacks, c.callbacks, 'callbacks');
      /* … the remaining single-writer claims … */
      if (c.beforeInsertionMove) {
        beforeMove.push(c.beforeInsertionMove);
      }
      if (c.afterInsertionMove) {
        afterMove.push(c.afterInsertionMove);
      }
    }

    if (insertion === null) {
      throw new TypeError('sortable: an axis feature — y() or xy() — is required');
    }
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
      try {
        retireHooks[i]!();
      } catch (nested) {
        ctx.report(nested);
      }
    }
    throw error;
  }

  retireHooks.reverse(); // release in reverse acquisition order

  return {
    resolveInsertion: insertion.resolve, // ← the pair, flattened
    invalidateInsertion: insertion.invalidate,
    onReorder: callbacks.onReorder,
    onStart: callbacks.onStart ?? NOOP_START, // ← normalized; see below
    onFinish: callbacks.onFinish ?? null,
    onCancel: callbacks.onCancel ?? null,
    onError: callbacks.onError ?? null,
    threshold: callbacks.threshold ?? DEFAULT_THRESHOLD,
    /* … the remaining optional slots, `null` when unfilled … */
    beforeMove,
    afterMove,
    retireHooks,
  };
}
```

**The contribution objects are dropped.** The assembler must not retain the feature array, the contribution array, or any reference to either. After `assemble()` returns, the only things that exist are the slot fields and the closures they hold — the features themselves are garbage.

**Two normalization rules, because "optional callback" is not one thing:**

- `onStart` is normalized to a **shared module-level no-op**, so the call site is `slots.onStart(item)` with no null check. It takes an argument the behavior already has.
- `onFinish`, `onCancel` and `onError` stay **nullable and null-checked**, because their arguments are result objects that would otherwise be constructed only to be discarded.

**Retire hooks run in reverse installation order**, and each is wrapped individually so one throwing hook cannot stop later hooks from restoring their DOM (review 4, §12). Reverse is the natural ownership order when hooks release resources acquired in declaration order; the kernel's outer try/catch around `spec.retire()` is a backstop, not a substitute.

**Cleanup is recorded before any claim runs, in installation order, and the list is reversed exactly once.** Two separate bugs made this ordering subtle:

- Appending the axis feature's `insertion.retire` _after_ the loop put it last in installation order and therefore **first** after the reverse — the opposite of the documented order for the common `[vertical(), layoutAnimation()]` composition (review 5, §10).
- Recording it _after_ the claim leaked the private state of the very contribution whose claim collided: a second axis feature has already allocated its rect index when `claim` throws, and the unwind only saw earlier contributions (review 6, §16).

Recording both hooks immediately after the factory returns fixes both. Factories are externally inert, so this is a retention and diagnostics concern rather than a DOM leak — but the stated unwind should be total, not nearly total.

```ts
type SortableSlots = Readonly<{
  /* required, filled by the axis feature */
  resolveInsertion: InsertionGeometry['resolve'];
  invalidateInsertion: InsertionGeometry['invalidate'];

  /* required, filled by callbacks() */
  onReorder: OnReorder;
  onStart: (item: HTMLElement) => void; // normalized, never null

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
| A required slot is unfilled | `sortable: an axis feature — y() or xy() — is required` / `sortable: callbacks({ onReorder }) is required` |
| A single-writer slot is written twice | `sortable: insertion geometry contributed by two features` |
| `onReorder` is not a function | `sortable: onReorder must be a function` |

## Hot-path shape

```ts
// permitted — a direct field read and call
const resolved = slots.resolveInsertion(draft, rt.view);

// permitted — a prebuilt, usually empty, fixed array, never on the move path
for (let i = 0; i < slots.beforeMove.length; i += 1) {
  slots.beforeMove[i]!(view);
}

// forbidden
for (const feature of features) {
  feature.onEvent(event);
}
features.filter((f) => f.type === 'geometry');
```

The pipelines are arrays because more than one feature may legitimately occupy them. They are fixed-length after assembly, empty in the minimal composition, and are touched only around a committed placeholder move — never per pointer move.

## Consumer-declared views, not producer projections (D-13)

Probe 1 typed feature seams as `Pick<SortableRuntime, 'current' | 'realm' | …>`. That works, but it points the dependency the wrong way: `vertical.ts` has to import the behavior's aggregate runtime type in order to describe what it needs.

Probe 2 inverts it. **A feature declares a minimal structural type in its own module.** The behavior's runtime happens to satisfy it. Same physical object, no allocation, no import edge from feature to behavior runtime, and the feature is independently typeable and independently unit-testable against a literal.

**Frame state and runtime state are separate arguments**, because they have separate owners and separate lifetimes:

```ts
// y.ts — imports no runtime type from the behavior
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

An earlier draft declared a single `InsertionView` carrying a `current` frame property, and claimed one stable per-controller object satisfied every view with no materialization. **That was not constructible** (review 4, §2). The kernel owns the swappable `current`/`draft` references exclusively and hands frames out only as arguments, so nothing the behavior holds can expose an up-to-date `current` property — not without stashing a kernel frame reference, mutating an adapter per call, or allocating a view per call, each of which contradicts a stated property. It also duplicated `pointerY` as both a view field and a separate parameter, and `action.prepare` receives `draft`, not `current`, so the sketch's `current.pointerY` read was wrong on its own terms.

Passing the two separately costs nothing and is honest about both:

- **The frame argument is the frame the kernel already handed the seam.** `Draft<Part>` and `Readonly<Frame<Part>>` both satisfy `InsertionFrameView` structurally, with no wrapper. A `prepare` passes its `draft`; nothing has to reach for `current`.
- **The runtime argument is one small `PresentationView` per operation**, created in `activation.effect` and cleared at retire. It exists because both feature views need a **non-null** `placeholder`, which a controller-lifetime runtime cannot promise before activation. Its `snapshot` is rewritten by `action.effect(COLLECTION)`. Two writes per operation, none per call, and no feature has to guard a null it can never see.

**Both views were widened during implementation, for the same reason.** The sketches above are the shapes the design started from; each was one field short of expressing the rule stated for it in this document. Both are behavior-internal and unstable by the boundary this document draws, so neither is a kernel-SPI change:

| View | Added | Why the sketch could not work |
| --- | --- | --- |
| `InsertionFrameView` | `item: HTMLElement \| null` | The destination view is the collection _minus_ the dragged item, and an axis rule that cannot exclude it measures a lifted element whose centre tracks the pointer — so it wins every search and pins the gap to its own slot. Read off the frame, where the item already is committed state, rather than copied onto the runtime view where it could drift. |
| `DisplacementView` | `insertion: Insertion`, `item: HTMLElement` | `insertion` is M-4's answer made expressible: without the destination gap a displacement feature cannot know which elements a move affects until after the write, so it must measure the whole destination view twice. `item` is ownership: membership in `snapshot` cannot exclude the dragged item, because the dragged item _is_ a member, and nothing else identifies it. |
| `InsertionRuntimeView` | `getVisual: ((item: HTMLElement) => HTMLElement) \| null` | Parity D2, and coherence: the axis rule measures candidate **visuals**, because the incumbent it compares them against is the placeholder and `placement.ts` sizes the placeholder from the visual's offset box. Nullable rather than normalized to identity, so the minimal composition pays no identity call per candidate per rebuild. |
| `InsertionRuntimeView` | `live: () => boolean` | I-36. The candidate loop calls a consumer resolver once per candidate, and a resolver may destroy the controller; the loop is feature-private (D-19, H-4) and cannot reach the behavior's runtime, so the reading has to arrive as data. |

**The per-operation view is the designated channel for per-operation behavior guarantees, and four widenings is enough to say so as a rule.** `InsertionFrameView` and `InsertionRuntimeView` have between them been widened additively four times — Phase 8a `item`, Phase 17 `pointerX`, Checkpoint D `getVisual`, C2-01 `live` — and in **every** case the behavior's existing per-operation object satisfied the new field structurally, with no wrapper, no per-operation or per-call allocation, and **no import edge appearing from a feature module back to the behavior's runtime**. D-13's mechanism is therefore not merely reusable, it is the default answer: a fifth widening is a routine act rather than a re-litigation of D-13. What the four data points do *not* license is treating the views as fixed — they are a growing structural contract, and a widening still has to justify its own field.

No view materialization on any path, no `Pick<>` anywhere, and no import edge from a feature to the behavior's runtime type. This is what makes H-6 work at the _runtime_ level, the same way §[04](04-frame-slicing.md) makes it work at the frame level.

## Private feature state, and what it answers

Probe 1's open question **Q-5** asked whether the packed geometry cache belongs on the shared runtime — where retirement can empty it uniformly, at the cost of leaking an axis-specific concept into a shared container — or inside `vertical()`, which would require a feature-owned retirement hook.

Under H-4 the question does not arise. The axis feature owns `rects`; the `retire` contribution is how it gets emptied; and no shared container exists to leak into. The cost is exactly one entry in `slots.retireHooks`.

| Feature | Private runtime | Escapes via |
| --- | --- | --- |
| `y()`, `xy()` | packed `Float64Array` rect index (stride 6) + parallel element array + dirty flag + last-seen collection version. The index _module_ is shared; each axis feature instance holds its own | `invalidate` marks it dirty; `retire` empties the element array and marks dirty |
| `layoutAnimation()` | `Map<HTMLElement, DisplacementRecord>` | `retire` restores every touched element exactly once |
| `landing()` | timing options, the WAAPI animation or the custom runner's handle | the `LandingHandle.destroy()` the kernel already holds |
| `placeholder()` | the factory and the class/attribute policy | nothing to release |
| `handle()`, `visual()` | none — pure resolvers | — |
| `callbacks()` | none — the consumer's functions | — |

Nothing here is reachable from the behavior, the kernel, or another feature.

## Feature-owned frame state — reserved, not implemented (D-10)

Everything above is _non-transactional_ private state. `SortableContribution` has no member for frame fields, and the kernel has no fold for them: it composes each frame from exactly two sources, its own literal and the behavior's part (§[04](04-frame-slicing.md) §Composition). **A feature cannot contribute transactional state in the first iteration.**

That is a narrowing, not a prohibition on principle. D-10 originally forbade feature frame parts on the grounds that they would force an aggregate type and break the hidden-class guarantee; both were wrong. The reason none exists is simpler: a frame field is committed state, so only a `prepare` may write it — and both pipelines here (`beforeInsertionMove`, `afterInsertionMove`) run in `action.effect`, post-commit. Admitting feature frame state would mean designing a prepare-phase pipeline as well. Neither is built, because no feature needs either, and building them anyway is the speculative generality the brief forbids.

## First-iteration features

**Advanced to Phase 17 (D7, Checkpoint D).** This section had been left at the pre-Phase-17 vocabulary while §The export topology this requires was amended, so the document gave two executable readings of the same surface. It now names what ships.

**Begun at Checkpoint D review 2 (C2-04), completed at Checkpoint D review 3 (C3-02).** C2-04's rule is the one below and is unchanged; it was simply not applied to every site, and the third review found the remainder — D-34 in 00, eight sites in 02 (`rollback`, tier-C vacuity, the `Activation` default, the seam table heading, hit testing, the landing origin, the action-tag count, the failure-stage list), the M-3 baseline sentence in this document, and four the review itself missed in 05 (I-17 and its note, the Q-4 tag count, Q-7's duplicate-read problem). D7's close said the remaining Part I `vertical()` prose was provenance, which does not hold for documents 00 ranks **normative in precedence order** (00–04): a current declaration, a consumer-facing example and a feature-state table are not provenance, whatever the resolution document calls them. Every *current* statement in 00–04 now names `y()`/`xy()`. What remains spelled `vertical()` in this document is exclusively narrative about an **earlier draft or an earlier probe**, and each such use carries its own frame in the sentence containing it — "an earlier draft" (§Geometry is a paired contribution), "review 5, §10" (§Retirement order), "probe 1 typed feature seams" and "probe 1's open question Q-5" (§Consumer-declared views, §Where the cache lives), and the rename record below. Nothing outside those frames uses the old name. The review files and `plan.md` remain provenance and are untouched.

```ts
y(): SortableFeature;                                         // axis — required
xy(): SortableFeature;                                        // axis — required
callbacks(options: SortableCallbacks): SortableFeature;       // required
placeholder(options?: PlaceholderOptions): SortableFeature;
handle(resolve: (item: HTMLElement) => HTMLElement | null): SortableFeature;
visual(resolve: (item: HTMLElement) => HTMLElement): SortableFeature;
layoutAnimation(options?: LayoutAnimationOptions): SortableFeature;
landing(options?: LandingOptions): SortableFeature;
```

**Exactly one axis feature is required, and either satisfies the requirement.** `y()` and `xy()` fill the same slot and are mutually exclusive; composing both is the single-writer collision `assemble()` reports.

### `y()` — the one-dimensional axis rule

One of two modules containing axis geometry, the other being `xy()`. A future `x()` is a sibling, never a branch inside either.

```text
candidates := centres of every non-dragged item's visual, plus the placeholder's own centre
nearest    := the candidate whose centre is closest to the pointer on the Y axis
if nearest is the placeholder  -> keep the current insertion (no change)
else  gap := follows(placeholder, nearest) ? slot + 1 : slot
```

**Amended at Checkpoint D (parity D2).** An earlier reading of this rule said "centres of every non-dragged item", and the implementation measured items. The candidate is the **visual** — `visual()`'s resolver applied to the item, or the item itself when no `visual()` is composed. The reason is internal coherence rather than only parity with the shipped index: the incumbent every candidate is compared against is the placeholder, and `placement.ts` sizes the placeholder from the _visual's_ offset box. Measuring items on one side of that comparison and a visual-derived box on the other biases the hysteresis for any visual that is an inset or offset descendant. The resolver reaches the axis rule as a nullable field on the per-operation runtime view — the same consumer-declared-view mechanism (D-13) that carries `placeholder`, which is itself a product of an optional feature's slot — so no axis module imports `handle.ts` and no sibling-feature dependency appears.

**A `visual()` resolver may destroy the controller, and that stops the traversal** (I-36, C2-01). Because the resolver runs once per candidate, the loop is a behavior-driven sequence over consumer code, and the kernel's own barriers sit outside it. On the first reading of a closed controller between resolver calls the rebuild calls nothing further, reads no further geometry, and leaves the cache in the **retired** state teardown already put it in — empty, dirty, unmeasured — rather than marking a half-filled index clean, which would pin every row of a destroyed controller against I-20. The frame then resolves to `null` down the ordinary I-15 path, so no new return channel exists and `resolve`'s control flow is unchanged. The same applies to `handle()` during admission, where the sequence declines instead: see §[05](05-lifecycle-invariants.md) I-36.

The placeholder being a candidate _is_ the hysteresis: a new gap is proposed only once another item's centre is genuinely closer than the placeholder's own slot. No dead band, no direction latch, no tunable — which is why the rule cannot be mistuned into oscillation. The current insertion stays authoritative until a genuinely better one is selected; a frame resolving to `null` commits nothing.

The rect index is marked dirty through `invalidate()` — called by the behavior at activation, on scroll and resize, after a committed placeholder move, on collection publication, and at release — and independently when the snapshot's version moves. A refresh rebuilds only when one of those holds, so a frame's search is one scalar scan.

**`invalidate()` is the whole reason geometry is a paired capability.** The behavior owns the events that make geometry stale; the feature owns the cache. Neither can do the other's half.

### `xy()` — the two-dimensional axis rule

Added at Phase 17, on its own subpath, as a **sibling** of `y()` rather than as a parameter of it. Same shape, same paired-capability contract, same `visual()`-measured candidate set, same placeholder-as-incumbent hysteresis; the metric is the difference:

```text
candidates := centres of every non-dragged item's visual, plus the placeholder's own centre
nearest    := the candidate whose centre is closest to the pointer by squared Euclidean distance
if nearest is the placeholder  -> keep the current insertion (no change)
else  gap := follows(placeholder, nearest) ? slot + 1 : slot
```

`xy()` consumes `pointerX` as well as `pointerY` — the **second** additive widening of the consumer-declared frame view (D-13/D-20), after Phase 8a added `item`. Two data points, so the honest reading is that the view is a growing structural contract rather than a fixed one.

**`y()` is not `xy()` with an axis switched off**, which is why the sibling shape is the one that ships. In a single-column list, carrying the pointer horizontally outside the column grows every candidate's X term by the same amount, and the squared sum lets that shared term swamp the Y ordering near a boundary. The two rules disagree on real input, so the split is a capability difference. Packaging follows: an unrestricted 2-D default would live in the behavior core and could not be tree-shaken, so every list consumer would carry the 2-D metric plus a narrowing feature on top of it; a single parameterized axis feature fails the same rule ~120 B more cheaply and in the same direction. Two subpaths keep each composition paying for its own rule, and the packaging test asserts the absence in both directions.

The rect index is shared (`rect-index.ts`, dimension-neutral — it already packed both centres) and each rule holds one privately. That costs the list composition 60 B and is recorded rather than absorbed: two copies of a cache that must stay in step is a class of divergence that is a silent correctness bug rather than a style one.

### `callbacks()`

```ts
type SortableCallbacks = Readonly<{
  onReorder: OnReorder; // required
  onStart?(item: HTMLElement): void;
  onFinish?(result: SortableFinishResult): void;
  onCancel?(result: SortableCancelResult): void;
  onError?(error: unknown, context: DragErrorContext): void;
  threshold?: number;
  readinessTimeout?: number;
}>;
```

One feature, because these are one coherent consumer surface and splitting them buys no tree-shaking — a `null` check on an uninstalled callback costs nothing.

Acceptance is never inferred: not from callback silence, not from DOM mutation, not from collection order, not from elapsed time, not from React eventually rendering something.

```ts
type OnReorder = (
  request: ReorderRequest,
  context: Readonly<{ signal: AbortSignal }>,
) => MaybePromise<ReorderResolution>;

type ResolutionOptions = Readonly<{
  /**
   * An authored presentation will follow, and will be acknowledged through
   * `controller.ready(request)`.
   *
   * Absent or `false` **asserts** the authored DOM is already final — true for a
   * consumer that mutates the list imperatively before returning, and false for
   * every framework-controlled one. It is an assertion the library cannot check;
   * see §`{ presentation: true }` is a consumer obligation below.
   */
  presentation?: boolean;
}>;

declare const ReorderResolution: Readonly<{
  accept(options?: ResolutionOptions): AcceptedReorderResolution;
  reject(
    reason?: unknown,
    options?: ResolutionOptions,
  ): RejectedReorderResolution;
}>;
```

**The resolution declares; the controller acknowledges** (D-33):

```ts
type SortableController = Readonly<{
  updateItems(items: readonly HTMLElement[]): void;
  /**
   * The authored presentation for `request` is committed. `request` is the one
   * `onReorder` was given — a request belonging to any other operation, or to
   * none, is ignored and reported.
   */
  ready(request: ReorderRequest): void;
  cancel(reason?: unknown): void;
  destroy(): void;
}>;
```

The previous shape took a `presentationReady` promise, which meant the consumer had to construct a promise before knowing a render would happen, supersede a previous one without dropping it, resolve it from a layout effect and never lose one — four obligations whose only failure signals were a 500 ms silence and, for a gate never held, nothing at all. Probe [13b](../probes/13b-settlement.md) is the case; 02 §The authored-presentation protocol is the reasoning. Obligations 1 and 2 are gone, and 3 is irreducible.

**Obligation 4 splits, and this document said only the good half** (Checkpoint C, C4-05). _After_ a consumer declares `{ presentation: true }`, a lost acknowledgement is bounded by the deadline and named by the kernel rather than silent — that is the improvement. _Without_ a declaration, a consumer that renders asynchronously anyway is **undetectable**, and the error stays tier C and silent, exactly as §`{ presentation: true }` is a consumer obligation states below. Writing "obligation 4 is bounded and named" without that condition claimed the opt-in cost nothing, which is the one thing an opt-in always costs.

**No settlement machinery crosses this boundary.** The consumer handles a boolean and the request it was already handed. That is deliberate: the request is per-operation, public, and — decisively — **in the consumer's hand before the render it acknowledges**, because it is the argument to the callback that asked for that render. An acknowledgement capability minted later than the mutation it acknowledges cannot survive a synchronous commit, which is exactly how the first draft of this revision failed review.

Nothing is **awaited**, then or now. `settlement.effect` returns `void` and the two gates hold independently, so the consumer's render still overlaps the landing animation instead of serializing ahead of it — which is the whole point of two independent gates, and is a structural property rather than a promise-handling convention.

The React reference integration is a ref and one call:

```tsx
const pending = useRef<ReorderRequest | null>(null);

const onReorder = (request) => {
  // Stored **before** the mutation, so a `flushSync` or synchronous renderer
  // that commits inside `setOrder` still finds it.
  pending.current = request;
  setOrder(reorder(request));
  return ReorderResolution.accept({ presentation: true });
};

useLayoutEffect(() => {
  if (pending.current !== null) {
    controller.ready(pending.current);
    pending.current = null;
  }
});
```

A consumer that keeps its order and its pending request in one state update needs no ref at all. Either way, the `createCommitTracker` helper both packages' stories carry — create, supersede, never drop — has no counterpart here. Phase 15 implements this and moves `sortable.stories.tsx` and `tests/sortable/react.browser.test.ts` with it.

#### `{ presentation: true }` is a consumer obligation, and it is opt-in

**Any consumer whose reorder is applied by a later render must declare it.** Absent or `false` asserts the authored DOM is _already final_, which is true for a consumer that mutates the list imperatively before returning, and false for every framework-controlled one. Omitting the declaration and rendering anyway means the drop can finalize before the authored commit — the placeholder is removed and the visual pinned against DOM the consumer is about to replace.

**The library cannot detect that**, and this document does not pretend otherwise. What it _can_ detect is the adjacent mistake: calling `controller.ready(request)` for an operation that declared nothing is **reported as contradictory and then dropped** — in `DEV`, on the platform channel, with no hold added, none released and the settlement outcome unchanged. It is a consumer-protocol report, in the same class as a stale or forged request: loud, and never applied. So a consumer that writes one half of the protocol gets told; a consumer that writes neither is indistinguishable from one that does not need it. The reasoning for keeping the default this way — flipping it turns the legitimate synchronous consumer into a 500 ms stall and a classified failure — is in §[02](02-kernel-behavior-contract.md) §Absent means _already final_, and the residue is carried as F-6's test obligation rather than as a claim.

The rule of thumb, which belongs in the public documentation Phase 15 writes: **if `onReorder` calls `setState`, declare a presentation.**

### `placeholder()`

The behavior always creates a placeholder; this feature only customises it. It is a _customisation_ feature, which its name under-communicates — an inherited wart from probe 1, kept because renaming it to `placeholderStyle()` reads worse at the call site.

Default mechanics, always present and not configurable away: the element occupies exactly one insertion position, carries `data-drag-placeholder` and `aria-hidden="true"`, inherits the item's `slot`, and is sized from the visual's **offset** box (unaffected by the item's transform or ancestor zoom). Beyond that the library writes no visual styling.

The placeholder is the dragged item's authoritative layout footprint for the whole operation: created detached during `activation.prepare`, inserted as a post-commit effect, never duplicated or lost, valid while the lifted visual is landing, released only when both gates are complete.

**It is a physical footprint, not a semantic one.** The React probe established that React neither detaches nor repositions the injected placeholder, but that an authored commit inserting a _new keyed item_ into the destination gap can leave it on the wrong side of the dragged item. The semantic anchor after readiness is therefore the **item**, and the behavior repairs the placeholder against it (D-16, §[05](05-lifecycle-invariants.md) F-15):

```ts
if (
  item.isConnected &&
  item.parentElement === placeholder.parentElement &&
  placeholder.nextElementSibling !== item
) {
  item.before(placeholder);
}
```

Each conjunct is load-bearing:

- **`nextElementSibling !== item`** — `Node.before()` on an already-correct position is a remove-and-reinsert, which resets CSS transitions on the placeholder and forces a reflow on every settlement.
- **`isConnected` and matching parents** — a consumer that unmounts or re-keys the dragged item as part of applying the reorder can leave `item` detached, or attached inside a different tree. Calling `before()` on it would then move the **placeholder** into that tree, destroying the very element the fallback measures (review 4, §16). The guard turns an anchor loss into a degraded but safe measurement instead of a detached placeholder.

When the guard fails, the behavior measures the still-connected placeholder where it stands. **This is the normative fallback**, not an open choice: Q-12 remains open only on whether a fixture ever shows it insufficient (§[05](05-lifecycle-invariants.md)).

### `landing()`

```ts
type LandingOptions = Readonly<{
  /**
   * A number fixes the timing at construction. A thunk is invoked **once per
   * landing**, at settlement, which is the moment the shipped
   * `landingTiming()` was read — so a distance-scaled or
   * per-drop duration keeps the default runner instead of replacing it.
   */
  duration?: number | (() => number);
  easing?: string;
  /** Full replacement for the default WAAPI runner — a spring, for example. */
  run?: LandingStart;
}>;
```

Without this feature the behavior holds no landing gate and no landing module is imported. The visual is pinned at the placeholder **in the same drain only when the readiness gate is also open** — an accepted resolution that declared a presentation still holds settlement open, because the two gates are independent in both directions (I-8, I-9). With `duration: 0` the gate is held and released through the runner — also immediate, but not the same code path, and the default path does not import the runner.

`landing({ duration, easing })` installs a Web Animations runner honouring `prefers-reduced-motion` by collapsing duration to zero. `landing({ run })` replaces it entirely; a spring driving `requestAnimationFrame` and calling `done()` when it settles is a first-class citizen, because nothing in the contract assumes a CSS timing function or a finite known duration.

**Synchronous completion is explicitly supported.** A `duration: 0` runner, or a custom runner that decides it has nothing to do, may call `done()` or `fail()` from inside `start` before returning a handle. The kernel makes that safe by reserving the hold _before_ calling `start` and publishing the returned handle before any queued completion can be applied (§[02](02-kernel-behavior-contract.md) §Request, seal, then arm). A completion is latched once: a second `done()`, or a `done()` after a `fail()`, is inert.

**A runner is never responsible for correctness.** The `target` in its context is provisional; the kernel measures again at the join and performs the authoritative pin through the lift session (D-16). A runner's only obligations are to call `done()`/`fail()`, and to relinquish the visual's transform on `destroy()` so the pin is not overridden — for a WAAPI runner, `animation.cancel()`.

`retarget?(target)` is optional and improves trajectory quality only. A runner that omits it is fully correct; one that implements it turns a late readiness correction from a step into a smooth adjustment (§[05](05-lifecycle-invariants.md) F-16).

### `layoutAnimation()`

Two seams bracket the single placeholder-move writer:

```text
slots.beforeMove[…]      measure current rects, then release owned offsets
placeholder DOM move     the sole writer of placeholder position
slots.measureInsertion   the axis rebuilds on settled presentation geometry
slots.afterMove[…]       re-measure, write inverted offsets, play
```

The library performs only the measurements and temporary offsets that make CSS animation possible; duration and easing are the consumer's. FLIP is the expected implementation, not a requirement.

**What it may write: `translate`, additively. Never `transform`.** Three properties of the write, in the order they were ruled out:

- Assigning `transform` _replaces_ an authored `rotate(4deg)` for the duration and overrides a consumer's own running transform animation.
- Additive `transform` is wrong too. Additive transform lists **concatenate**, so the offset lands inside the element's own `scale()` and moves it by a multiple of the delta — while the delta was measured in viewport space.
- The individual `translate` property applies _before_ `transform` in the used-value chain (`translate → rotate → scale → transform`), so the offset sits outside the element's own transform and needs no correction; and `composite: 'add'` composes it with an authored `translate`, or with a consumer animation on the same property, instead of clobbering either.

**What it may touch: snapshot members in the crossed span, and nothing else.** Not the placeholder, whose position the behavior owns; not unrelated siblings, which a sibling walk otherwise picks up; and **not the dragged item**, whose presentation the kernel's lift owns. The dragged item is not a hypothetical: the placeholder is inserted immediately after it, so it is the first sibling every backward span walks over. Under any top-layer lift its rect does not change across the bracket, so animating it produces a zero delta and _looks_ correct — the ownership violation is visible only in the reads, which is how it has to be pinned.

**It is not a lifecycle gate, and under D-7 it structurally cannot become one:** it has no access to `SettlementScope`, which is passed only to `settlement.effect`. An in-flight displacement never delays release, settlement or presentation teardown. This is a case where probe 2 turns a probe-1 _rule_ into an absence of capability.

**Retargeting** is the same mechanism as the release above, not a special case. Every owned element — this move's span **union** whatever is still in flight — is measured where it currently looks, released, and replayed from that position after the write. So an interrupted displacement continues from where it visually is rather than restarting from a full delta, and exactly one animation exists per owned element at any time. A displacement completion carries no operation identity because it can affect nothing outside the feature's own element map; retirement empties that map, so a late completion finds nothing to write.

**Acquisition is all-or-nothing**, the same obligation `landing()` has: `finished` is an accessor and `then` is a call, and an animation that is started but never entered into the map would survive `retire()` and keep offsetting an element nothing owns.

**Q-7 is answered** (`packages/drag2/.plan/measurements/q7.md`, M-4). The displacement set is the crossed span, 0.16ms against 2.3ms per committed move at 800 rows. The two features never contend for a shared read: the axis rebuild is _re-timed_ into the bracket rather than duplicated, so a committed move performs one full pass — the one it was always going to perform on the next frame — plus `2 × |span ∪ in-flight|` element reads. The behavior-owned read phase the open question anticipated exists, but it costs nothing, and it is there for correctness rather than for cost.

## The collection model

```ts
type CollectionSnapshot = Readonly<{
  items: readonly HTMLElement[];
  version: number;
}>;
```

The published snapshot lives on the behavior's private runtime, not in a frame: it is replaced wholesale, never mutated, and `updateItems()` shallow-copies the caller's array so a queued snapshot cannot be changed by a later caller mutation. The frame holds the snapshot the _current operation_ is reasoning about, which may lag the published one by at most one queued action.

`reconcileCollection` is pure and identity-based, ported unchanged:

- an **internal** gap survives only when `before` and `after` remain present and adjacent in the destination view;
- a **start** gap survives only when `after` remains the first destination item;
- an **end** gap survives only when `before` remains the last destination item;
- otherwise the operation cancels with `CANCEL_COLLECTION_INVALIDATED`, or with `CANCEL_ITEM_REMOVED` if the dragged item itself vanished.

Intent is **never** recomputed from the latest pointer position. The exact identity gap survives or the operation ends.

**Publication is an effect, not a preparation.** `prepare` stages a `PreparedCollection` and writes only the draft; `effect` publishes `rt.snapshot` and `rt.view.snapshot` and calls `slots.invalidateInsertion()`. An earlier draft published from `prepare` and returned `false` — which does not typecheck against `{} | null`, and, more seriously, meant a reentrant cancel or destroy could invalidate the preparation after the private runtime had already been replaced (review 4, §4).

**The action never discards, and it branches by phase.** Both matter: discarding loses the consumer's update (§[02](02-kernel-behavior-contract.md) §An invalidating collection replacement must not be lost), and _not_ branching means `draft.snapshot` gets rewritten in every phase — which retains item elements in an idle frame against I-20, and rewrites the very transaction snapshot the release path froze.

| Phase | `prepare` stages | Binds `draft.snapshot`? | `effect` |
| --- | --- | --- | --- |
| `IDLE` | The snapshot. | **No** — an idle frame must retain no DOM (I-20). | Publish. |
| `PENDING` | The snapshot. `cancelReason` if the pressed item vanished. | Yes | Publish. |
| `ACTIVATING` | Same as `ACTIVE`. | Yes | Publish; invalidate geometry; cancel last if staged. |
| `ACTIVE` | The snapshot plus the rebased insertion, written into the draft. `cancelReason` when the gap cannot survive. | Yes | Publish; invalidate geometry; cancel last if staged. |
| `RELEASING`, `SETTLING`, `REPORTING`, `FINALIZING` | The snapshot only. | **No** — the operation's semantic snapshot is frozen and the transaction is decided. | Publish. |

A commit for a phase whose frame fields did not change is a no-op swap of two identical frames — one `Object.assign` on a path that already replaces a collection. Paying it uniformly is what keeps "a discarded action touched nothing" true without a per-phase exception.

### `ACTIVATING` is handled, not deferred

An earlier draft said an update arriving during `ACTIVATING` was "queued behind the activation checkpoint and applied as `ACTIVE`". **That cannot be obtained from FIFO** (review 5, §5): `activation.effect` calls `onStart` _before_ the kernel dispatches `START_COMMITTED`, so an `updateItems()` from inside `onStart` is appended **first** and FIFO requires it to run first — while the phase is still `ACTIVATING`. Getting the documented behavior would have needed a pending slot, an explicit requeue with an anti-spin bound, or a reordering of the activation checkpoint.

None of those is needed, because **the deferral itself is unnecessary now**. I-30's post-commit ordering already guarantees that `rt.placeholder`, `rt.lift` and `rt.view` are published _before_ `onStart` runs, and the home insertion is committed. An `ACTIVATING` frame is therefore as reconcilable as an `ACTIVE` one, so the collection action treats the two identically and the deferral, the pending slot and the requeue rule all disappear.

`onStart` calling `updateItems()` is an executable case in the test matrix, not a derivation.

**And the invalidating case needs one explicit rule**, because "the cancel transition runs next" is _not_ true in this reentrant ordering (review 6, §14). The FIFO sequence is: `onStart` queues the collection action → activation returns and queues `START_COMMITTED` → the collection effect publishes and queues `CANCEL`. `START_COMMITTED` is already ahead of `CANCEL`.

**The rule: `host.cancel` latches synchronously.** The kernel's cancel latch is set the moment `host.cancel` is called, not when the `CANCEL` action is applied, and `START_COMMITTED` checks it — so an operation cancelled during `ACTIVATING` never reaches `ACTIVE`. This is the existing I-21 latch ("first valid cancel per operation wins", kernel-private) doing exactly what it was built for; what was missing was saying that `START_COMMITTED` consults it.

The alternative — activate, then cancel immediately afterwards — would be defensible only if nothing observable happened in between, and `START_COMMITTED` is a phase commit that later actions branch on.

**The checkpoint defers; it does not retire.** Refusing to advance leaves the phase at `ACTIVATING`, and the `CANCEL` queued behind it settles there — which is what delivers the single terminal callback §[02](02-kernel-behavior-contract.md) §I-31 requires. Retiring from the checkpoint instead would race the cancellation to the same operation and swallow it.

## Tree-shaking

Judged through consumer fixtures, not source intuition — and **measured** (M-3, baselined 2026-08-02 — [measurements/m3.md](../measurements/m3.md); table re-measured 2026-08-07 at Checkpoint D and after each of its three reviews, superseding the pre-Phase-15 figures this section used to publish):

| composition           | brotli       | modules | vs minimal |
| --------------------- | ------------ | ------- | ---------- |
| minimal (`y()`)       | **10.08 kB** | 31      | —          |
| minimal (`xy()`)      | 10.13 kB     | 31      | +0.05 kB   |
| + `layoutAnimation()` | 10.49 kB     | 32      | +0.41 kB   |
| + `landing()`         | 10.39 kB     | 32      | +0.31 kB   |
| complete              | **10.86 kB** | 35      | +0.78 kB   |

The **property** this section asserts is that each optional feature adds only itself, and it holds: the module graph shows no optional module in a composition that did not ask for it, in either direction.

**The numbers are not "unchanged since M-3", and saying so was wrong** (C2-05, Checkpoint D review 2). M-3 recorded `landing()` at +0.27 kB and `complete` at **+0.76 kB** against a **9.33 kB** minimal — `+0.77` against `9.34` after that document's own re-measure note, and never `+0.81`, which this sentence carried until Checkpoint D review 3 (C3-04) checked it against [`../measurements/m3.md`](../measurements/m3.md); the deltas have moved with every absolute figure since, and the table above is re-measured after C2-01 rather than carried forward. Read the deltas as measurements with a date, not as invariants.

The absolute figures moved with D-33's settlement protocol (+70 B), Phase 16's non-tree-shakeable keyboard ingress (~300 B), Phase 17's shared rect index (+60 B), Checkpoint D's fixes (+40 B), C2-01's terminal barrier (+30 B to +90 B, composition-dependent) and C3-01's abort return channel (±20 B, inside brotli's noise band); the budgets were re-based with them. **Headroom is now 0.17–0.23 kB against budgets set at ~0.3 kB**, which is a Phase 21 re-base rather than something to absorb again (see [`../plan.md`](../plan.md) §Phase 21).

The absences below are **asserted against the bundled module graph**, not inferred from the deltas — a module can be pulled in and mostly shaken, which produces a small delta and reads like success. **Composition itself costs 0.25 kB (2.4%)** against a feature-matched build that fills the slot record by hand; **migrating from the shipped `sortable.js` costs 3.18 kB**, and the two baselines answer different questions and are never substituted for each other.

1. No global registry, no barrel that eagerly references every feature, no default options object naming an optional feature.
2. Each feature is its own module with no import edge to a sibling feature, and no import edge to the behavior's runtime type (D-13 removes the last one).
3. The behavior reaches optional capabilities only through `slots.x` fields that are `null` when unfilled — never through a default implementation imported at the top level.

### The minimal fixture, exactly

```ts
sortable(items, y(), callbacks({ onReorder }));
```

**A minimal one-dimensional sortable necessarily contains one-dimensional axis geometry.** An earlier draft required "axis geometry" to be absent from the minimal build while also making the axis feature required — an impossible target (review 4, §24). What the brief actually requires absent is _unselected_ geometry and unselected optional work (`brief.md:615-637`):

| Must be absent from the minimal build                     |
| --------------------------------------------------------- |
| the axis rule the fixture did not import (`xy()` from a `y()` build, and `y()` from an `xy()` build), and a future `x()` |
| free drag                                                 |
| layout displacement (`layoutAnimation`)                   |
| landing animation (`landing`, and the WAAPI runner)       |

**The "any input mode other than pointer" row is withdrawn (D7, Checkpoint D).** It was written before D-32 and is contradicted by the artifact: keyboard sorting is a `BehaviorSpec` member, not an optional feature, so every composition carries it and no consumer can shake it away. That is a **deliberate accessibility position**, recorded as such in Phase 16 — the alternative, a `keyboard()` feature, would have made an accessibility floor opt-in. Its ~300 B is inside the re-based budgets. Leaving the row standing would have made the minimal build's own packaging test unpassable in principle.

The **five** compositions to measure: minimal (`y()`); minimal (`xy()`), measured as a peer rather than assumed equal to `y()`; minimal + `layoutAnimation()`; minimal + `landing()`; the complete set.

### The export topology this requires

A separate subpath entry per optional feature is what makes the measurement honest: the minimal fixture's import graph physically cannot reach geometry it did not import, independent of bundler heuristics. The shipped package exposes only `draggable.js` and `sortable.js` (`packages/drag/files.json`, `packages/drag/package.json:15-24`), so this is a new topology and has to be written down before it is measured, or ergonomics will quietly reintroduce an eager barrel.

| Subpath | Runtime exports | Type exports |
| --- | --- | --- |
| `drag.js` | `draggable`, the 14 **`FAILURE_*` constants** | `Point`, `FailureStage`, `DOMRealm`, `Behavior` (opaque) |
| `sortable.js` | `sortable`, **`ReorderResolution`**, **`AT_PROPOSAL`**, **`AT_CONSUMER`** | `ReorderRequest`, `ReorderProposal`, `CollectionSnapshot`, `ReorderResolution`, `AcceptedReorderResolution`, `RejectedReorderResolution`, `AcceptedReorderResult`, `NoopReorderResult`, `RejectedReorderResult`, `CanceledReorderResult`, `ReorderTransactionResult`, `SortableFinishResult`, `SortableCancelResult`, `CancelStage`, **`DragErrorContext`**, `SortableController`, `PlaceholderFactory`, **`SortableFeature`** (opaque) |
| `sortable/y.js` | `y` | — |
| `sortable/xy.js` | `xy` | — |
| `sortable/callbacks.js` | `callbacks` | `SortableCallbacks`, `OnReorder`, **`ResolutionOptions`** |
| `sortable/placeholder.js` | `placeholder` | `PlaceholderOptions`, `PlaceholderContext` |
| `sortable/handle.js` | `handle`, `visual` | — |
| `sortable/landing.js` | `landing` | `LandingOptions`, `LandingStart`, `LandingContext`, `LandingHandle` |
| `sortable/layout-animation.js` | `layoutAnimation` | `LayoutAnimationOptions` |

Three cells changed at the phase 9 freeze, each closing something the original table left contradictory:

- **The stage constants are runtime exports.** §The public/internal boundary already called them public — a consumer receiving `onError` or a canceled result has to discriminate them — but the runtime column listed only `draggable` and `sortable`, so the type shipped and the values did not. A numeric union whose members are unnameable is not a public type.
- **`DragErrorContext` ships from `sortable.js`, not `drag.js`.** It carries `domain: ReorderTransactionResult`, a sortable result. `draggable` was given its own entry precisely so a future free-drag consumer need not reach the sortable behavior, and having that entry declare a behavior's result union would undo it. The kernel half, `FailureStage`, stays on `drag.js`.
- **`PlaceholderContext` is listed.** `PlaceholderOptions.create` is a function of it, so it was already structurally public; naming it is what makes that deliberate rather than incidental.

A fourth correction followed from running TypeDoc over the frozen entries: four more aliases were **structurally public but unnameable** — reachable through a public type, resolvable by a consumer's compiler, and absent from the documented surface. `CollectionSnapshot` (via `ReorderProposal.snapshot`), `PlaceholderFactory` (via `PlaceholderOptions.create`), and `AcceptedReorderResolution`/`RejectedReorderResolution` (the two members of the `ReorderResolution` union) are now exported from `sortable.js`. This is the same rule that made `FailureStage`, `DOMRealm` and `Point` public: **export what a public type structurally depends on rather than pretending it is internal.**

**A sixth cell changed at the Phase 14 re-freeze, and it is one alias rather than two.** `ResolutionOptions` joins `sortable/callbacks.js` because `ReorderResolution.accept` is a function of it — the same "export what a public type structurally depends on" rule as the four aliases above. It ships from `callbacks.js` rather than `sortable.js` because a composition that installs no `callbacks()` has no `onReorder`, and therefore no presentation to declare.

An earlier draft of the revision exported **two** types here, `PresentationToken` and `PresentationDeliverer`, describing a kernel-owned gate object the consumer had to hold. Checkpoint C's criterion — do not expose more settlement machinery than the consumer needs — plus the synchronous-commit defect that design carried, removed both. What ships instead is a boolean and a method on the controller, and `SortableController` was already public.

**A seventh change at Phase 17, and it is two cells rather than one.** The two-dimensional insertion rule ships as a **sibling axis feature** on its own subpath, `sortable/xy.js`, and the axis features are renamed to the axes they measure: `vertical()` → **`y()`** on `sortable/y.js`, with a future horizontal rule reserved as `x()`.

The shape was chosen against the constraint the ledger states (L-8, §5): whichever form 2-D took, it must not make the 1-D case pay for it. That eliminated the option with shipped precedent — an unrestricted 2-D default that an axis feature narrows — because a default lives in the behavior core and cannot be tree-shaken away, so every list consumer would carry both rules. It also eliminated one parameterized axis feature, which puts the 2-D metric and its `compareDocumentPosition` call in the list consumer's graph. Two subpaths keep each composition paying for its own rule, and `tests/packaging.node.test.ts` asserts the absence in **both** directions.

What the two features share is `rect-index.ts`, a dimension-neutral packed geometry cache, held privately per feature instance. That sharing costs the list composition a measured **60 B** — recorded rather than absorbed, because the alternative is two copies of a cache that must stay in step, where a divergence is a silent correctness bug. The 2-D _rule_ itself costs a list consumer nothing.

The rename is a **breaking public change** and the second one this part has made, after D-33's `ResolutionOptions`. It is recorded here rather than treated as cosmetic: `vertical` was a layout word for a rule that is about a coordinate, and the vocabulary only becomes ambiguous once a second axis exists.

`ReorderResolution`'s two member types are unchanged in name and in discrimination; the optional argument changed and `SortableController` gained `ready`, which together are a **breaking public change** — the one this revision makes. Phase 15 implements it, and the consumer fixture's per-subpath export equality is what will fail if it is implemented halfway.

The fifth dangling reference was resolved the other way. `OnReorder` returned `MaybePromise<ReorderResolution>`, and exporting that alias would put a generic utility with no domain meaning on the frozen surface purely so a documentation tool could resolve a link. Its structure is written out in the signature instead — `ReorderResolution | PromiseLike<ReorderResolution>` — which is also the more honest statement, since the kernel reads `then` once and never assumes a native promise. **TypeDoc over the nine public entries — eight until Phase 17 added `sortable/xy.js` — now emits zero unresolved-reference warnings, and none are suppressed**: a warning there means a public type depends on something a consumer cannot name, which is a surface defect and not noise.

### Public option domains

Frozen with the surface, because a domain is as much a compatibility promise as a signature. Every one throws a `TypeError` outside its domain — a `NaN` threshold otherwise activates on nothing and a `NaN` duration produces an animation that never finishes, both diagnosed three seams away from the call that caused them.

**Where the check runs depends on when the value exists, and that is the whole of the distinction** (D4, Checkpoint D). A *fixed* option — every row below except one — is a value the consumer already holds at construction, so it is validated **at construction**, exactly once, before any drag. `landing({ duration })` additionally accepts a **thunk**, whose result does not exist until the landing opens: it is therefore invoked and validated **once per landing**, at settlement, and an invalid or thrown result classifies there rather than at construction. A thunk itself is validated at construction only for being a function.

The reduced-motion collapse does not change this. Resolution and validation precede it, so a consumer whose thunk throws or returns `NaN` is told so under `prefers-reduced-motion: reduce` exactly as it is without — which is what the shipped `landingTiming()` did, and what Checkpoint D repaired.

| Option | Unit | Domain | Default |
| --- | --- | --- | --- |
| `callbacks({ threshold })` | CSS px, straight-line from the press | finite, `>= 0` | `8` |
| `callbacks({ readinessTimeout })` | ms | finite, `>= 1` | `500` |
| `landing({ duration })` | ms | finite, `>= 0`; or `() => number` returning one | `200` |
| `layoutAnimation({ duration })` | ms | finite, `>= 0` | `160` |

- `threshold` at `0` activates on the first move reporting a different point.
- **`readinessTimeout` becomes a public option at this freeze.** It was a behavior-fixed 500ms, which caps a _consumer-supplied_ promise with no escape: a re-render that legitimately involves a round trip failed with `FAILURE_PRESENTATION_READY` and no way to say otherwise. It lives on `callbacks()` because that is already the sole owner of the consumer-policy defaults. It is a **failure bound, not a schedule** — the gate releases as soon as the promise settles, and exceeding it replaces the settlement. It is not permitted to be `Infinity`: an unbounded gate holds presentation forever, which is the state the bound exists to prevent.
- `easing` is deliberately unvalidated on both features. It is a CSS easing function, the platform is the only correct parser for one, and `animate()` reports a bad value itself.
- `landing({ run })` replaces the default runner entirely, so `duration` and `easing` are not read — and therefore not validated — when it is present.
- `landing({ duration })` as a **thunk** is the one settle-time domain. It is called once per landing, its result is validated against the same domain as the fixed form, and a throw or an out-of-domain result is classified as a landing failure at that moment. This is the parity shape for the shipped `landingTiming()` (ledger §2, L-6).

**`ReorderResolution` is a runtime export as well as a type** (review 6, §10). The documented consumer calls `ReorderResolution.accept(…)` and `ReorderResolution.reject(…)`, the shipped package exports the same factory, and listing it under types only would have made every example in these documents fail to run. The name is deliberately both a value and a type, as it is today.

Three decisions the earlier table left open (review 5, §12):

- **`draggable` moves to its own `drag.js` entry.** It is behavior-agnostic, so putting it under `sortable.js` would make a future free-drag consumer import the sortable behavior to reach it. The shipped `draggable.js` entry is replaced, not kept alongside.
- **`SortableFeature` has exactly one identity, wherever it is declared.** The rule is a property of the emitted declaration graph, not a physical file:

  1. there is exactly **one** branded `SortableFeature` declaration in the whole emitted graph — never a structurally-equal duplicate per subpath;
  2. `sortable.js` and every public feature subpath resolve to **that** declaration, so a feature built by one subpath is assignable to the parameter another declares;
  3. the module that declares it is **not** a declared package subpath, so the brand — and the authoring types beside it — stay unconstructible from outside.

  An earlier draft of this rule named the file instead ("declared in `sortable.js`, re-exported nowhere"), which is the wrong constraint and, taken literally, the worse one: putting the brand in the entry module makes every feature subpath's declaration import from `../sortable.js` and drag the whole sortable entry graph into a subpath that otherwise needs one line. What the rule exists to prevent is two identities, and identity is what it should say. It is satisfied today by declaring the brand in the internal `sortable/feature` module, which every subpath imports type-only and which no `exports` entry names.

- **Every runtime entry above becomes a `files.json` entry.** Shared contract _types_ are imported type-only, so they contribute no runtime edge, but they still need the declaration files to resolve — which is why the identity question above is not cosmetic.

The exact import statements for each measurement fixture are part of M-3, not of this table.

### The public/internal boundary

The brief asks for this and the earlier draft did not state it.

**Internal and unstable** — not exported, and free to change without notice: `BehaviorSpec`, `KernelHost`, `Transition`, `ReleaseTransition`, `SettlementTransition`, `ActionTransition`, `CommandAdmission`, `SettlementInput`, `SeamOutcome`, `SeamRejection`, `ArmOutcome`, `ActivationScope`, `SettlementScope`, `LifetimeScope`, `FeatureContext`, `SortableContribution`, `SortableSlots`, `InsertionGeometry`, and the phase/lift/outcome/recovery constants.

**Public and stable:** everything in the table above, plus the `FailureStage` and `CancelStage` constants — a consumer receiving `onError` or a canceled result has to be able to discriminate them, so keeping them internal while embedding them in public types was the same contradiction as the feature type.

`CommandAdmission` (D-32) is on the internal side deliberately, and it is worth saying why, because it is the one revision member a consumer might expect to see. A behavior declares which event types the kernel binds; a _consumer_ does not. Keyboard reordering reaches the public surface in Phase 16 as behavior capability and, where it needs configuring at all, as a `callbacks()`-style option — never as an event-type list a consumer hands the kernel. The same argument keeps the axis features out of the keyboard path (ledger L-4).

`ResolutionOptions` (D-33) is on the **public** side and is the only type the revision adds there. That is forced rather than chosen: `ReorderResolution.accept` is a function of it, so it is structurally public whether or not it is named — the rule that already made `FailureStage`, `DOMRealm`, `Point`, `PlaceholderFactory` and `CollectionSnapshot` public.

**The settlement primitives stay internal, and that is the point of D-33's final shape.** `SettlementScope`, `PreparedSettlement` and the settlement attempt are as unreachable after the revision as before it. The consumer's half of the authored-presentation protocol is a boolean it sets and a request it hands back — neither of which is a library object — so nothing about how the gate works crosses the boundary.

`SortableFeature` and `Behavior` are public **as opaque value types**: nameable and passable, not constructible.

#### Closed for real: the feature value is opaque

Two earlier attempts at this boundary were both incoherent, in opposite directions.

The first said "only built-ins may author" while exporting nothing to enforce it — and TypeScript accepts a structurally matching function literal whether or not a type name is exported (review 5, §12). The second admitted that and exported `SortableFeature` as _public and stable_ while keeping `FeatureContext` and `SortableContribution` _internal and unstable_. That is not a third state, it is a contradiction (review 6, §11): `SortableFeature` was **defined** as a function between the two unstable types, so any change to either changed the public type's assignability and its emitted declaration. Accepting it in public `sortable()` made the whole authoring shape a semver surface regardless of the "unsupported" label.

**The feature value is now opaque.**

```ts
declare const FEATURE_BRAND: unique symbol;
type SortableFeature = Readonly<{ [FEATURE_BRAND]: true }>;
```

A consumer can hold a feature, name its type, and pass it to `sortable()`. It cannot construct one, because the brand is unexported. The authoring types stay genuinely internal, third-party authoring is _prevented_ rather than discouraged, and the closed world the rest of this document depends on is real. The brand is declaration-only and costs nothing at runtime. `Behavior` is opaque by the same mechanism, for the same reason.

The same leakage was fixed in three other places by **exporting what the public type structurally depends on** rather than pretending it is internal: `FailureStage` (public — `onError` receives it and a consumer must switch on it), `DOMRealm` (public — `LandingContext` carries it, and a custom runner needs it), and `Point` (already public).

If feature authoring is ever supported, that is a deliberate decision to export `FeatureContext` and `SortableContribution` under a versioning promise — not a side effect of a type becoming reachable.

### What isolation cannot shake

Measure the fixed cost too, and compare it against a hand-written, non-composed sortable — feature-matched against the composed one, whichever axis it composes — so the bundle claim is evidence rather than import-graph intuition:

- every optional key in `SortableContribution`;
- every assembler property read and `claim` branch;
- the nullable slot fields and their null checks;
- the three always-present pipeline arrays.

That plumbing may well be entirely acceptable. It has not been weighed.

## Policy updates

The set of installed features is immutable after controller creation. A feature may accept live policy updates only if it deliberately exposes them, and the only supported way is for the _behavior_ to add a controller method — a feature does not contribute one.

This is a deliberate narrowing of probe 1, which allowed feature-contributed controller methods. No first-iteration feature needs it, and admitting it would put an unbounded string-keyed record into the contribution type. Recorded as an extension point, not built.