# Control-panel surface cleanup — drag2

**Commit files were read at:** `f375e6b1` (worktree `/tmp/wt-f375e6b1`, branch `drag2/cleanup-der-f375e6b1`). Read-only; nothing under this path was modified.

**Scope.** All of `packages/drag2/src`. Targeted search for the owner's control-panel hypothesis — a separately allocated runtime object created only to present a narrower or readonly TypeScript surface over an existing entity, owning no distinct state, identity, lifecycle, computation, protocol transition or translation. Covered: every `export function create*` factory, every `class`, every hand-written `Readonly<{ … }>` / interface census entry touched by the D-170 class migration (steps 0–5, landed through this commit), and every `return {` object-literal site outside those already-converted classes. Not separately covered: `.spec.browser.test.ts` / `.node` test files, and `bench/`.

## Findings

**None.** No runtime object matching the control-panel shape was found. This is a supported null result, not an absence of search — the candidates below were the ones structurally closest to the hypothesis, and each was inspected and rejected for a stated reason rather than passed over.

## Candidates inspected and rejected (no defect)

For each: the object, what it superficially resembles, and why it does not fit.

### 1. `KernelHost` (`src/kernel/kernel.ts`, `host` literal ~L2360–2408; type at `src/kernel/spec.ts`)

Closest match to the hypothesis on its face: a `Readonly<{ … }>` record handed to behavior code, several of whose members (`cancel`, `destroy`) are spread straight through from elsewhere with no added logic. This is exactly what D-170 §The step-6 boundary examined in detail and declined to convert to a class, for three independent reasons recorded there: it is **assembled from four separate owners** (no single object exists that it could be the instance type of — the kernel, the driver, and two data fields), it **withholds capabilities deliberately** (no member lets a behavior drive a kernel transition — the narrowing is the design, not an accident), and it is **published authoring vocabulary on a surface already decided to be structural** (D-47/D-48: an author writes a factory literal and reads `KernelHost`). `fail` and `dispatch` are real protocol translations (stage classification, action-tag range checks), not pass-through. Ownership and lifecycle question already routed to and settled by the architect; not reopened here.

### 2. `BehaviorSpec` adapters, `createSortableSpec` / `createFreeDragSpec` (`src/sortable/spec.ts` ~L1879–1980, `src/free-drag/spec.ts` ~L1069–1120)

Each returns a freshly allocated object literal, one per controller, whose own comment states "every member here forwards to the entity and adds nothing" — the strongest surface match to the hypothesis in the tree. It exists because `BehaviorSpec` is a protocol record with nested namespaces (`activation: { prepare, effect }`, `action: { prepare, effect }`, …) required by the kernel's own dispatch shape, while the entity behind it (`SortableBehavior` / `FreeDragBehavior`) is a flat class per D-170's representation decision — a class's `this` cannot present a nested-namespace shape. The adapter is the structural translation between those two shapes (D-170: "Keeping the namespaces in the adapter is what lets the entity be a flat class without the kernel learning a second shape"), which is a real protocol transition under the review's own carve-out, not a narrowing façade. `activation.prepare` for free drag additionally answers a protocol constant (`return true`) rather than forwarding at all, which the adapter's own JSDoc distinguishes from the forwarding members.

### 3. `RectIndex` / `LinearShift` read views (`src/sortable/rect-index.ts`, `ReadonlyFloat64Array`; class accessors `values`/`hole`/`items`/`count`)

Fits the letter of "readonly TypeScript surface over an existing entity" but not a _separately allocated_ one: `ReadonlyFloat64Array` is satisfied by the class's own `#values`/`#hole` `Float64Array` fields returned directly from the getters — no second object is constructed. This is the class itself, narrowed by type only, per D-170 §The ownership boundary (measured there as free at runtime and required specifically because a mapped `Readonly<E>`/`Pick<E,…>` alias silently erases method-ness from the `unbound-method` gate the migration runs behind). External mutation happens only through declared operations (`advance`, `remeasureHole`) parameterized by the caller's own rule, not through the view — i.e. the class owns every field it mutates, which is the opposite of a control panel that owns nothing.

### 4. `SortableController` / `FreeDragController` (`src/sortable/controller.ts`, `src/free-drag/controller.ts`)

Both are `Readonly<{ … }>` records assembled from a mix of kernel-owned members spread through unchanged (`cancel: host.cancel`, `destroy: host.destroy`) and behavior-owned members that translate a public call into a queued kernel action (`invalidate()` → `host.dispatch(TAG_COLLECTION, null)`, `moveTo(point)` → `host.dispatch(TAG_POSITION, point)`). These are the package's published consumer API, not an internal projection over some other already-existing entity — there is no wider entity that `SortableController` narrows; it _is_ the addressable object a consumer holds. The dispatch calls are real protocol translation (tag-based action encoding), not field copying.

### 5. `BehaviorLiftSession` (`src/kernel/presentation.ts` ~L310–330)

A `Readonly<Pick<VisualLiftSession, …>>` type. Explicitly documented and verified as a **type-only** projection — "The kernel passes the _same object_ under the narrower type, so it costs no allocation" — so there is no separately allocated runtime object here at all, only a TypeScript-only narrowing the project's own conventions endorse (CONTRIBUTING §3: type-level structure should disappear from the bundle).

### 6. `bounds()`, `landing()` (`src/free-drag/bounds.ts`, `src/sortable/landing.ts`, `src/free-drag/landing.ts`, `src/shared/landing.ts`)

Each returns an object literal from a factory, but each owns real state and computation: `bounds()`'s closure owns a lazily-resolved rect and a staleness flag with a documented resolution-timing rule; `createLandingTiming` owns resolved duration/easing and computes a `Math.hypot` distance and a reduced-motion collapse per call. The two `landing()` entries are explicitly documented as thin factories sharing one behavior-neutral policy module while keeping distinct installer _types_ per tier — a deliberate non-generalization (CONTRIBUTING §2.2), not a hidden duplicate.

### 7. `createRealm`, `createLifetime`, `createOperationLifetimes`, `createFrameTask`, `createInvalidator` (`src/kernel/realm.ts`, `src/kernel/lifetimes.ts`, `src/kernel/invalidation.ts`)

Each owns real mutable state (a disposer stack and abort controller; a pending value and rAF handle; DOM listener registration) or performs real cross-realm computation (`isElement`'s `instanceof` check against the owning window rather than the ambient one). D-170 already classifies three of these (`createLifetime`, `createFrameTask`, `createActionQueue`) as "handles rather than entities" and keeps them as functions on a stated criterion (no invariant spanning two fields, under seventy lines) — consistent with what was found here.

## Scope note on the D-170 census

D-170 §The ownership boundary independently ran a structurally similar sweep over every `Readonly<{ … }>` alias in `src/` (twenty-two at one measured commit, twenty at the time of this entry) and classified each as either an **entity alias** (the object one owner implements and owns — converted to a class where in scope) or a **capability/protocol record** (assembled from more than one owner, or from a party other than the object that constructs it — kept as a record). That census is architect work already on the record, not reproduced findings here; this pass's independent read of the same tree agrees with it on every candidate it re-examined (§1–4 above) and found nothing outside it.