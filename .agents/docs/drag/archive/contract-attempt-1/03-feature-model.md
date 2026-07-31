# 3. Feature model

Features are **construction-time contributors to one behavior**. They are not
runtime plugins, they have no generic event interface, and after assembly they
do not exist as objects at all — only the fields they wrote.

## The installer (C-5)

```ts
type SortableFeature = (install: SortableInstall) => void;
```

A feature is a function that writes into named seams. It runs once, during
`sortable()` construction, in declaration order.

```ts
type SortableInstall = Readonly<{
  /* single-writer slots — a second writer is a construction error */
  insertionRule(resolve: InsertionRule): void;
  placeholderFactory(create: PlaceholderFactory): void;
  handleResolver(resolve: (item: HTMLElement) => HTMLElement | null): void;
  visualResolver(resolve: (item: HTMLElement) => HTMLElement): void;
  landingRunner(create: LandingRunnerFactory): void;
  activationThreshold(px: number): void;
  consumerCallbacks(callbacks: SortableCallbacks): void;

  /* multi-writer seams — run in installation order */
  beforeInsertionMove(fn: (runtime: DisplacementRuntime) => void): void;
  afterInsertionMove(fn: (runtime: DisplacementRuntime) => void): void;
  retire(fn: () => void): void;
}>;
```

Why an installer rather than a slot record: a feature routinely occupies more
than one seam. An animated placeholder participates in pre-mutation measurement,
placeholder relocation, post-mutation measurement, animation cleanup and
operation retirement. A record of assignable fields forces that feature to be
five features or to smuggle a generic callback type; an installer expresses it
directly.

```ts
function layoutAnimation(options?: LayoutAnimationOptions): SortableFeature {
  return (install) => {
    const state = createDisplacementState(options);
    install.beforeInsertionMove((runtime) => measure(state, runtime));
    install.afterInsertionMove((runtime) => invertAndPlay(state, runtime));
    install.retire(() => cancelAll(state));
  };
}
```

## Assembly

`assemble(features)` produces one frozen-by-convention `SortableSlots` object:

```ts
type SortableSlots = {
  /* required */
  resolveInsertion: InsertionRule;
  onReorder: OnReorder;

  /* optional, `null` when no feature filled them */
  createPlaceholder: PlaceholderFactory | null;
  getHandle: ((item: HTMLElement) => HTMLElement | null) | null;
  getVisual: ((item: HTMLElement) => HTMLElement) | null;
  createLandingRunner: LandingRunnerFactory | null;
  onStart: ((item: HTMLElement) => void) | null;
  onFinish: ((result: SortableFinishResult) => void) | null;
  onCancel: ((result: SortableCancelResult) => void) | null;
  onError: ((error: unknown, context: DragErrorContext) => void) | null;

  /* compiled pipelines, empty arrays when nothing installed */
  beforeMove: readonly DisplacementHook[];
  afterMove: readonly DisplacementHook[];
  retireHooks: readonly (() => void)[];

  threshold: number;
};
```

Validation runs once, at construction, and throws `TypeError`:

| Rule | Message shape |
| --- | --- |
| A required slot is unfilled | `sortable: vertical() is required` / `sortable: callbacks({ onReorder }) is required` |
| A single-writer slot is written twice | `sortable: insertion rule installed twice` |
| `onReorder` is not a function | `sortable: onReorder must be a function` |

Assembly is the **only** place features are iterated. After it returns, the
feature functions are unreachable and the hot path reads plain fields.

## Hot-path shape

```ts
// permitted — a direct field read and call
const resolved = slots.resolveInsertion(runtime, pointerY);

// permitted — a prebuilt, usually empty, fixed array
for (let i = 0; i < slots.beforeMove.length; i += 1) { slots.beforeMove[i]!(runtime); }

// forbidden
for (const feature of features) { feature.onEvent(event); }
features.filter((f) => f.type === 'geometry');
```

The multi-writer pipelines are arrays because more than one feature may
legitimately occupy them; they are `readonly` and fixed-length after assembly,
and they are empty in the minimal composition, so the loop is one length read.
They are never touched on the pointer-move path — only around a committed
placeholder move.

## Seam catalogue

| Seam | Kind | Called at | Filled by |
| --- | --- | --- | --- |
| `resolveInsertion` | single | coalesced spatial frame; release | `vertical()` **(required)** |
| `onReorder` | single | release, once | `callbacks()` **(required)** |
| `onStart` | single | `ACTIVATING`, before the checkpoint | `callbacks()` |
| `onFinish` / `onCancel` | single | `FINALIZING`, after presentation release | `callbacks()` |
| `onError` | single | `REPORTING` | `callbacks()` |
| `createPlaceholder` | single | activation, before publication | `placeholder()` |
| `getHandle` | single | inside `pointerdown` dispatch | `handle()` |
| `getVisual` | single | inside `pointerdown` dispatch | `visual()` |
| `createLandingRunner` | single | settlement entry | `landing()` |
| `activationThreshold` | single | construction (read into `KernelSpec.threshold`) | `callbacks()` or `threshold()` |
| `beforeInsertionMove` | multi | immediately before the placeholder DOM move | `layoutAnimation()` |
| `afterInsertionMove` | multi | immediately after the placeholder DOM move | `layoutAnimation()` |
| `retire` | multi | operation retirement, destroy, panic | any feature holding resources |

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

Owns the packed rect index, the nearest-centre search and the dirty policy. It
is the only module containing axis geometry; a future `horizontal()` would be a
sibling, never a branch inside this one.

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
would buy no tree-shaking — a `null` check on an uninstalled callback costs
nothing.

### `placeholder()`

The behavior always creates a placeholder; this feature only customises it.

```ts
type PlaceholderOptions = Readonly<{
  /** Build the element. Receives the subject and its rect at grab. */
  create?(context: PlaceholderContext): HTMLElement;
  /** Applied to whatever element exists — default or custom. */
  className?: string;
  attributes?: Readonly<Record<string, string>>;
}>;
```

Default mechanics, always present and not configurable away: the element
occupies exactly one insertion position, carries `data-drag-placeholder` and
`aria-hidden="true"`, inherits the item's `slot`, and is sized from the visual's
**offset** box (unaffected by the item's transform or ancestor zoom). Beyond
that the library writes no visual styling — colour, border, background and
transition are the consumer's, through `className`, attributes or CSS variables.

The placeholder is the dragged item's authoritative layout footprint for the
whole operation: it is created before publication, it never duplicates or
disappears, it remains valid while the lifted visual is landing, and it is
released only when both settlement gates are complete.

### `landing()` (C-9)

```ts
type LandingOptions = Readonly<{
  duration?: number;
  easing?: string;
  /** Full replacement for the default WAAPI runner — a spring, for example. */
  run?: LandingRunnerFactory;
}>;
```

Without this feature no runner is created, `landingDone` starts `true`, and the
visual is pinned at the placeholder immediately. Installing it with
`duration: 0` is *also* immediate but goes through the runner; the default path
does not import the runner at all.

### `layoutAnimation()` (C-10)

Measures affected neighbours before the placeholder moves, re-measures after,
writes inverted transforms and plays them out — a FLIP-shaped implementation,
but the contract requires only the measurement/write seams, not the technique.
Consumers configure duration and easing through CSS; the feature performs only
the measurements and temporary transform writes that make CSS animation
possible.

It is **not** a lifecycle gate: an in-flight displacement never delays release,
settlement or presentation teardown. Interruption is retargeting — a placeholder
move while a previous displacement is running cancels and replays from the
current computed transform — and `retire` restores every touched element exactly
once.

## Tree-shaking rules

Judged through consumer fixtures, not source intuition.

1. No global registry, no barrel that eagerly references every feature, no
   default options object naming an optional feature.
2. Each feature is its own module with no import edge to a sibling feature.
3. The behavior references optional slots only through `slots.x` fields that are
   `null` when unfilled — never through a default implementation imported at the
   top level.
4. Axis geometry, landing animation and layout displacement must be absent from
   a minimal build. The four compositions to measure are: minimal; minimal +
   `layoutAnimation()`; minimal + `landing()`; the complete set.

## Policy updates

The set of installed features is immutable after controller creation. A feature
may accept live policy updates only if it deliberately exposes them — by
contributing a controller method through the installer, never by being replaced.
No first-iteration feature does this.
