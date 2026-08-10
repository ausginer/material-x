# 8. Public surface

## Entry points

`@ydinjs/drag2` ships subpath entries so a consumer's import graph decides what is bundled. No barrel re-exports every feature.

| Entry | Contents |
| --- | --- |
| `@ydinjs/drag2/draggable.js` | `draggable()`, kernel value types, `DraggableBehavior` |
| `@ydinjs/drag2/sortable.js` | `sortable()`, `ReorderResolution`, `SortableResult`, sortable value and result types |
| `@ydinjs/drag2/sortable/vertical.js` | `vertical()` |
| `@ydinjs/drag2/sortable/callbacks.js` | `callbacks()` |
| `@ydinjs/drag2/sortable/placeholder.js` | `placeholder()` |
| `@ydinjs/drag2/sortable/handle.js` | `handle()` |
| `@ydinjs/drag2/sortable/visual.js` | `visual()` |
| `@ydinjs/drag2/sortable/layout-animation.js` | `layoutAnimation()` |
| `@ydinjs/drag2/sortable/landing.js` | `landing()` |
| `@ydinjs/drag2/react.js` | the readiness helper and the `useLayoutEffect` handshake |

A separate entry per optional feature is what makes the size measurements honest: the minimal fixture's import graph physically cannot reach axis geometry it did not import, independent of bundler heuristics.

## Consumer surface

```ts
function draggable<Controller>(
  root: HTMLElement,
  behavior: DraggableBehavior<Controller>,
): Controller;

function sortable(
  items: readonly HTMLElement[],
  ...features: readonly SortableFeature[]
): DraggableBehavior<SortableController>;

type SortableController = Readonly<{
  updateItems(items: readonly HTMLElement[]): void;
  cancel(reason?: unknown): void;
  destroy(): void;
}>;
```

### Features

```ts
function vertical(): SortableFeature;
function callbacks(options: SortableCallbacks): SortableFeature;
function placeholder(options?: PlaceholderOptions): SortableFeature;
function handle(
  resolve: (item: HTMLElement) => HTMLElement | null,
): SortableFeature;
function visual(resolve: (item: HTMLElement) => HTMLElement): SortableFeature;
function layoutAnimation(options?: LayoutAnimationOptions): SortableFeature;
function landing(options?: LandingOptions): SortableFeature;
```

### Values a consumer sees

```ts
type ReorderRequest = Readonly<{
  item: HTMLElement;
  version: number;
  from: number;
  to: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;

type OnReorder = (
  request: ReorderRequest,
  context: Readonly<{ signal: AbortSignal }>,
) => MaybePromise<ReorderResolution>;

const ReorderResolution: Readonly<{
  accept(presentationReady?: PromiseLike<void>): AcceptedReorderResolution;
  reject(
    reason?: unknown,
    presentationReady?: PromiseLike<void>,
  ): RejectedReorderResolution;
}>;

const SortableResult: Readonly<{
  isAccepted(
    result: ReorderTransactionResult,
  ): result is AcceptedReorderTransactionResult;
  isRejected(
    result: ReorderTransactionResult,
  ): result is RejectedReorderTransactionResult;
  isCanceled(
    result: ReorderTransactionResult,
  ): result is CanceledReorderTransactionResult;
  isNoOp(
    result: ReorderTransactionResult,
  ): result is NoOpReorderTransactionResult;
}>;

type PlaceholderContext = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
  rect: DOMRectReadOnly;
}>;

type DragErrorContext = Readonly<{
  cause: FailureCause;
  domain: ReorderTransactionResult | null;
}>;
```

Constants exported as values, not string unions: `OUTCOME_*`, `CANCEL_*`, `FAILURE_*`, `RECOVERY_*`. They are numeric so comparisons are cheap and the identifiers minify; consumers compare against the exported constant, never a literal.

## Feature-authoring surface

Public but marked advanced. A feature author needs the installer, the runtime projections and the landing runner shape.

```ts
type SortableFeature = (install: SortableInstall) => void;

type SortableInstall = Readonly<{ /* artifact 3 */ }>;

type InsertionRule = (
  runtime: InsertionRuntime,
  pointerY: number,
) => Insertion | null;
type PlaceholderFactory = (context: PlaceholderContext) => HTMLElement;
type LandingRunnerFactory = (context: LandingContext) => LandingRunner;
type DisplacementHook = (runtime: DisplacementRuntime) => void;

type InsertionRuntime = Pick<
  SortableRuntime,
  'current' | 'realm' | 'snapshot' | 'placeholder' | 'rects' | 'slots'
>;
type DisplacementRuntime = Pick<
  SortableRuntime,
  'current' | 'realm' | 'placeholder' | 'snapshot'
>;
```

Projections are type aliases over the one physical runtime. They restrict what a feature may reach for, nothing more.

## Behavior-authoring surface

Public but marked experimental — the boundary was derived from one behavior and is expected to move.

```ts
type DraggableBehavior<Controller> = (kernel: Kernel) => Controller;
type Kernel = Readonly<{ /* artifact 1 */ }>;
type KernelSpec<Frame extends KernelStateFrame> = Readonly<
  { /* artifact 1 */ }
>;
type KernelStateFrame = { /* artifact 1 */ };
type KernelRuntime = { /* artifact 4 */ };
type OperationIdentity = object;
type Disposer = () => void;
type Lifetime = Readonly<{ signal; finalized; use; useWhile; dispose }>;
```

The phase constants, the transaction primitives and the lifetime factory are exported here. The action tags are not: a behavior declares its own tags from `BEHAVIOR_ACTION` and never needs a kernel tag's value.

## Internal — not exported

The action tag constants and handlers · the queue implementation · the rect index · the coordinate mapper · the lift strategies and style leases · the readiness watch · the invalidator and frame task · `reconcileCollection` · `buildReorderProposal` · `assemble()` and `SortableSlots` · every `handle*` function.

Internal modules are unit-tested directly through relative imports, exactly as in `packages/drag`. Being testable does not make something public.

## React integration

Not a polished package this iteration. Its purpose is to prove the core contract works under asynchronous controlled rendering.

```ts
function createPresentationReadiness(): Readonly<{
  promise: Promise<void>;
  resolve(): void;
}>;
```

The fixture must demonstrate: a controlled array rendered with stable keys; `draggable(root, sortable(...))` controller creation; `updateItems()` on every collection change; `onReorder` updating React state and returning `accept(readiness.promise)`; `useLayoutEffect()` resolving readiness; a consumer-styled placeholder; a no-animation mode; and an animated mode.

## Stability

Everything is pre-alpha. `drag2` is an architectural laboratory: there is no compatibility commitment, no deprecation policy and no migration path from `@ydinjs/drag`. The consumer surface is nonetheless designed as if it were public, because a contract that only has to satisfy tests proves nothing.