# `@ydinjs/box-quad` — implementation brief

## Goal

A small modern ponyfill inspired by `Element.getBoxQuads()`, optimized first for:

1. runtime performance;
2. minified + Brotli size;
3. correctness inside a deliberately narrow 2D scope.

Primary use cases: drag constraints, editors, selection overlays, handles, snapping, collision detection, and geometry inside zoomed/transformed canvases.

This is **not** a GeometryUtils polyfill.

## Scope v1

Supported:

- `HTMLElement`;
- one unfragmented principal box;
- border-box only;
- viewport coordinates by default;
- coordinates relative to any same-document `HTMLElement`;
- nested 2D `transform`;
- `transform-origin`;
- individual `translate`, `rotate`, and `scale`;
- skew and arbitrary 2D matrices through `transform`;
- CSS `zoom`, including nested `zoom + transform`;
- page and nested-container scrolling;
- block-like box-generating elements: block, inline-block, flex, grid, replaced elements.

Not supported:

- multi-fragment inline elements;
- text nodes or pseudo-elements;
- SVG / MathML;
- 3D / perspective / preserve-3d;
- iframe or cross-document conversion;
- native `getBoxQuads()` delegation;
- full spec compatibility.

Do not implement a runtime `display` whitelist. The contract is “one unfragmented principal border box”.

## Public API

One entrypoint:

```ts
import {
  createBoxQuadCache,
  getBoxQuad,
  readBoxQuad,
  type BoxQuadCache,
  type Quad,
} from '@ydinjs/box-quad';
```

### Output

```ts
export type Quad = Float64Array;
```

A valid quad has eight values:

```text
[0] p1.x  [1] p1.y
[2] p2.x  [3] p2.y
[4] p3.x  [5] p3.y
[6] p4.x  [7] p4.y
```

Point identity follows local border-box corners:

```text
p1 ───── p2
│         │
p4 ───── p3
```

Rotation does not reorder the points.

### Low-level API

```ts
export function readBoxQuad(
  element: HTMLElement,
  out: Quad,
  relativeTo?: HTMLElement,
  cache?: BoxQuadCache,
  reset?: boolean,
): boolean;
```

Contract:

- `true`: `out` was fully written;
- `false`: result cannot be represented inside the supported model;
- on failure, `out` remains unchanged;
- no hot-path runtime validation of output type or length;
- reusable output enables allocation-free repeated reads.

### Convenience wrapper

```ts
export function getBoxQuad(
  element: HTMLElement,
  relativeTo?: HTMLElement,
  cache?: BoxQuadCache,
  reset?: boolean,
): Quad | null;
```

It allocates `new Float64Array(8)`, delegates to `readBoxQuad`, and returns `null` on failure. No separate geometry logic.

## Coordinate semantics

Without `relativeTo`, output uses layout viewport coordinates, compatible with `clientX/clientY` and `getBoundingClientRect()`.

With `relativeTo`, output uses the local border-box coordinate space of that same-document element. It need not be an ancestor.

This should hold:

```ts
readBoxQuad(element, out, element);
```

```text
0, 0,
width, 0,
width, height,
0, height
```

A non-invertible `relativeTo` transform must fail.

## Matrix strategy

Use realm-owned `DOMMatrix` as the initial/default primitive.

Prefer mutable methods:

- `multiplySelf`;
- `preMultiplySelf`;
- `translateSelf`;
- `scaleSelf`;
- `invertSelf`.

Do not build a custom matrix library before realistic benchmarks prove a meaningful win.

Avoid `DOMPoint`/`DOMQuad` allocation in the core path. After composing the final matrix, write the four transformed points directly into the supplied `Float64Array`.

```text
transform composition → DOMMatrix
output storage         → Float64Array
point transformation   → direct scalar writes
```

Use constructors from `element.ownerDocument.defaultView`, not ambient globals.

## Cache

Caching is explicit and consumer-owned.

```ts
export type BoxQuadCache = /* opaque mutable holder */;

export function createBoxQuadCache(): BoxQuadCache;
```

Conceptually it owns:

```ts
{
  map: WeakMap<Element, InternalSpace>;
}
```

When `cache` is supplied:

- `reset !== true`: reuse cached coordinate-space data;
- `reset === true`: replace its internal `WeakMap` before computing the current result.

Example:

```ts
const cache = createBoxQuadCache();

readBoxQuad(first, firstOut, canvas, cache, true);
readBoxQuad(second, secondOut, canvas, cache);
readBoxQuad(third, thirdOut, canvas, cache);
```

The consumer defines the measurement epoch and decides when to reset. Stale values before reset are allowed by contract.

Cache completed local-to-viewport coordinate spaces, not merely `DOMRect`. Compute inverse lazily when an element is used as `relativeTo`. Reuse common ancestors where practical. Do not keep a global immortal cache.

## Development process: BDD/TDD first

Tests are the executable specification for agents.

### Phase 1 — BDD only

Produce reviewed behavioral scenarios and expected semantics. No production code.

### Phase 2 — red browser tests only

Use Playwright and real layout engines. Do not use jsdom as the geometry authority. Tests must initially fail because implementation is absent.

Do not change reviewed expectations to fit an implementation.

### Phase 3 — correctness implementation

Implement the most direct understandable solution with `DOMMatrix`. No byte golf. Make the approved browser suite green.

### Phase 4 — cache/performance

Add consumer-owned cache, reset semantics, common-ancestor reuse, lazy inverses, and allocation analysis.

### Phase 5 — bundle optimization

Only after correctness:

- profile realistic scenarios;
- reduce allocations and branches;
- test minification-oriented shapes;
- enforce minified + Brotli budgets.

Behavior tests remain fixed constraints.

## Required behavior suite

### Layout

- plain block;
- inline-block;
- flex/grid items;
- replaced elements;
- borders and positioned ancestors;
- disconnected, `display:none`, `display:contents`.

### Transforms

- translate;
- uniform/non-uniform scale;
- rotate 90° and 180°;
- negative scale;
- skew;
- `matrix()`;
- custom `transform-origin`;
- nested transforms;
- individual `translate`, `rotate`, `scale`;
- individual properties combined with classic `transform`.

### Zoom

- integer and fractional zoom;
- nested zoom;
- source/ancestor/relativeTo zoom;
- zoom + transform;
- zoom + scroll.

### Scrolling

- page scroll;
- nested scrollers;
- multiple scrolling ancestors;
- source and relative target in different branches.

### `relativeTo`

- ancestor;
- distant ancestor;
- non-ancestor;
- `relativeTo === element`;
- transformed/zoomed/scrolled target;
- same-document enforcement;
- non-invertible target.

### Unsupported geometry

- 3D transform;
- perspective;
- preserve-3d;
- multiline inline;
- fragmented layout where feasible.

Unsupported cases should fail predictably, never silently return knowingly wrong geometry.

### Cache behavior

- reuse inside one epoch;
- shared ancestor reuse;
- lazy inverse reuse;
- geometry may be stale before reset;
- reset observes updated geometry;
- reset happens before the current calculation;
- removed elements are weakly held.

### API behavior

- low-level function uses supplied output;
- no replacement allocation in `readBoxQuad`;
- wrapper allocates output and delegates;
- failure leaves output unchanged;
- wrapper returns `null`;
- point ordering remains stable.

## Expected values

Prefer simple human-verifiable fixtures:

- integer translation;
- scale 2;
- rotate 90°/180°;
- `transform-origin: 0 0`;
- zoom 2;
- simple scroll offsets.

Do not generate expected values through the same helper/algorithm as production code. For complex compositions use independently reviewed snapshots with tolerance.

## Performance benchmarks

Measure full reads, not isolated matrix multiplication:

- one cold viewport-relative read;
- one cold `relativeTo` read;
- one warm cached read;
- 100 siblings relative to one canvas;
- 100 nested elements;
- 100 elements sharing groups;
- reset every read versus one epoch;
- nested zoom + transforms;
- non-ancestor `relativeTo`.

Track total time, allocations, style/layout reads, matrix constructions, cache hit rate, and inverse count.

## Bundle acceptance

Measure minified + Brotli for:

- `readBoxQuad`;
- `getBoxQuad`;
- cache-enabled use;
- complete entrypoint.

Directional target:

```text
core read path: roughly ≤ 1.0–1.5 kB Brotli
```

The target is not permission to sacrifice correctness. Do not grow this into a general geometry framework.

## Agent constraints

1. Do not broaden scope without approval.
2. Do not implement 3D, iframe, SVG, fragments, or spec compatibility.
3. Do not delegate to native `getBoxQuads()`.
4. Do not invent a matrix library before benchmarking `DOMMatrix`.
5. Do not alter reviewed expected values to fit code.
6. Do not optimize size before tests are green.
7. Do not introduce a global geometry cache.
8. Keep one public entrypoint.
9. Centralize mechanics in `readBoxQuad`.
10. Keep `getBoxQuad` a thin allocating wrapper.
11. Cache invalidation belongs to the consumer.
12. Preserve local-corner point ordering.
13. Treat performance and Brotli size as product requirements.

## Delivery checkpoints

### A — contract

BDD scenarios, API declarations, failure table, supported/unsupported matrix, cache semantics. No implementation.

### B — tests

Red Playwright tests, fixtures, expected-value derivations. No production code.

### C — correctness

Direct `DOMMatrix` implementation, approved tests green, coordinate-composition explanation.

### D — performance

Benchmarks, cache analysis, allocations, before/after results. No semantic changes.

### E — bundle

Minified + Brotli measurements, import-specific measurements, final API docs.

## Final decisions

```text
package:              @ydinjs/box-quad
entrypoints:          one
output:               Float64Array(8)
core API:             readBoxQuad
wrapper:              getBoxQuad
box mode:             border-box
default space:        viewport
relativeTo:           any same-document HTMLElement
matrix primitive:     DOMMatrix
transforms:           classic and individual 2D properties
CSS zoom:             required
cache:                consumer-owned WeakMap holder
reset:                explicit argument
fragments:            unsupported
3D:                   unsupported
iframes:              unsupported
native delegation:    no
process:              BDD/TDD first
top priorities:       performance and minified + Brotli size
```