# Artifact 1 — Public API

## 1. Entrypoint

The package has one public entrypoint:

```ts
import {
  readBoxQuad,
  type BoxQuadCache,
  type Quad,
} from '@ydinjs/box-quad';
```

No subpath entrypoints are part of v1.

## 2. Public types

```ts
export type Quad = Float64Array;

export type BoxQuadCache = WeakMap<HTMLElement, unknown>;
```

Consumers construct and own the cache identity and lifetime:

```ts
const cache: BoxQuadCache = new WeakMap();
```

The package owns every entry it writes. Consumers must not inspect, add,
replace or delete entries. The `unknown` value type prevents typed consumers
from depending on the private representation, but entry opacity is contractual
because native `WeakMap` methods remain available.

A valid `Quad` has eight values:

```text
[0] p1.x  [1] p1.y
[2] p2.x  [3] p2.y
[4] p3.x  [5] p3.y
[6] p4.x  [7] p4.y
```

The points retain the identity of these source-local physical border corners:

```text
p1 ───── p2
│         │
p4 ───── p3
```

Equivalently, before coordinate conversion they are:

```text
p1 = (0, 0)
p2 = (borderBoxWidth, 0)
p3 = (borderBoxWidth, borderBoxHeight)
p4 = (0, borderBoxHeight)
```

Transforms, negative scale, rotation, writing mode and text direction never
sort or relabel the points.

The TypeScript alias cannot express a length of eight. The hot path does not
validate the output constructor, length or writability.

## 3. Functions

### 3.1 `readBoxQuad`

```ts
export function readBoxQuad(
  element: HTMLElement,
  out: Quad,
  relativeTo?: HTMLElement,
  cache?: BoxQuadCache,
): boolean;
```

| Result | Meaning |
| --- | --- |
| `true` | All eight output values were written with the requested quad. |
| `false` | The request hit a recognized unsupported or unrepresentable geometry case. |

On `false`, every observable value in `out` remains exactly as it was at call
entry. The implementation must therefore finish validation and calculation
before committing the eight values to `out`.

The no-partial-write guarantee applies to the `false` result. Contract-violating
arguments and unexpected platform or implementation errors are outside the
boolean result contract; no output-state promise is made when an exception
escapes.

`readBoxQuad` performs no replacement output allocation visible to the caller.
Internal implementation choices remain subject to later performance work.

Omitting `cache` performs a fresh uncached read and retains no observations for
later public calls. Reusing one cache permits stale observations within that
cache's epoch. Passing a newly constructed `WeakMap` starts a fresh epoch. See
[artifact 5](05-cache-semantics.md).

## 4. Coordinate spaces

### 4.1 Default output

Without `relativeTo`, output is in layout viewport coordinates. Values align
with `clientX`/`clientY` and `getBoundingClientRect()`, including current page
and container scroll positions.

### 4.2 Relative output

With `relativeTo`, output is in the target's local physical border-box space.
The target may be an ancestor, descendant, unrelated branch element or shadow
tree participant, but it must be an `HTMLElement` in the same `Document` whose
own layout and geometry case is otherwise supported by the v1 matrix.

The one-box rule remains necessary but not sufficient for a target. An
unguaranteed source layout does not become supported merely because its element
is passed as `relativeTo`; a request using such a target remains unguaranteed.

The target's own local origin and axes are used before its transform. Therefore
a representable self-relative request yields:

```text
0, 0,
borderBoxWidth, 0,
borderBoxWidth, borderBoxHeight,
0, borderBoxHeight
```

The target coordinate space must be invertible. A non-invertible target fails
even when `relativeTo === element`.

### 4.3 Physical coordinates

Local x/y are physical, not logical:

- x increases toward the physical right;
- y increases toward the physical bottom;
- p1 is the physical top-left border corner.

This remains true for vertical writing modes and RTL direction.

### 4.4 Transform reference boxes

Output is always expressed from the source's local physical border-box corners,
but CSS transforms need not use that border box as their reference box.

V1 supports effective HTML transform reference spaces that resolve to:

- the element's border box;
- the element's content box.

`transform-origin` percentages and percentage translations in both classic
`transform` and individual `translate` resolve against the effective transform
reference box. A content-box reference also contributes the content box's
physical offset from the local border-box origin before transform composition.

Authored `transform-box` syntax is not itself the classification boundary. If
the browser's effective HTML reference space is a border box or content box, it
is supported. Other effective reference spaces remain unguaranteed.

## 5. Degenerate geometry

An otherwise supported source with a principal border box may validly have zero
width, zero height or a transform that collapses its viewport projection. Such
a source succeeds for viewport output because its four transformed corner
values remain representable. A principal box alone does not promote an unnamed
layout mode into the supported matrix.

When that same non-invertible space is used as `relativeTo`, conversion fails.
The distinction is representability of the source points versus invertibility
of the requested target space.

## 6. Realm and primitive requirements

- `DOMMatrix` and any other constructed DOM geometry primitives come from
  `element.ownerDocument.defaultView`.
- The initial/default matrix primitive is that owner-document realm's
  `DOMMatrix`.
- `readBoxQuad` uses the caller-supplied output and does not replace its realm or
  identity.
- The public output is always a `Float64Array`, not `DOMPoint` or `DOMQuad`.
- The core path transforms corner scalars directly into the output
  representation.
- Native `Element.getBoxQuads()` is never delegated to, even if present.
- A read wholly within one document is supported when that document is hosted
  in an iframe; its default output uses that document's own layout viewport.
- Crossing from one document to another is a recognized failure, not a realm
  bridge.

The realm rule is observable for same-document elements created by a different
JavaScript realm, such as an adopted element: after adoption, the current owner
document's constructors govern the read.

An environment without a usable owner-document window or required `DOMMatrix`
primitive does not produce a boolean geometry failure. It is an unsupported
execution environment, and its ordinary platform/implementation error escapes.

## 7. Error boundary

The following are ordinary `false` results only when explicitly
recognized by [artifact 3](03-failure-table.md):

- unsupported geometry;
- absent or fragmented principal boxes;
- cross-document source/target conversion;
- non-invertible target conversion.

The implementation must not blanket-catch:

- platform getter or method exceptions;
- unexpected `DOMMatrix` failures;
- implementation defects;
- contract-violating arguments.

It need not add runtime checks solely to force malformed arguments to throw.
Normal JavaScript/platform behavior may surface such misuse.

## 8. Non-goals

The API does not expose:

- a requested output box choice other than border-box (distinct from the
  supported transform reference boxes);
- fragment lists;
- point or quad classes;
- matrices or coordinate-space objects;
- cache invalidation observers;
- a cache factory or in-place reset operation;
- an allocating output wrapper;
- cross-document conversion;
- native GeometryUtils compatibility.
