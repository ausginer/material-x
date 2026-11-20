# Artifact 1 — Public API

## 1. Entrypoint

The package has one public entrypoint:

```ts
import {
  ancestry,
  coordinates,
  localDelta,
  projection,
  type Box,
  type Delta,
  type Quad,
  type Space,
} from '@ydinjs/box-quad';
```

No subpath entrypoints are part of v1. The manifest's `./package.json` export is not API.

## 2. Measurement and projection

Measuring an element and expressing its corners in a coordinate space are separate calls.

- **`coordinates`** is the only operation that reads layout. It measures one element into a `Box`.
- **`ancestry`** reads computed style up the flat tree and never the element's own box. It writes the `Space` the element inherits.
- **`projection`** and **`localDelta`** are arithmetic over caller-owned numbers. They read no DOM.

A quad in viewport coordinates is `coordinates(element, box)` followed by `projection(box, quad)`. A quad in a target's local space measures both elements and passes the target's `Box` as `relativeTo`. A measured `Box` can be projected any number of times and against any number of targets, and no function changes it after `coordinates` writes it.

[Artifact 2](02-behavior-scenarios.md) calls this composition _the read_: measure the source, measure the target when there is one, then project. The read fails when any of its calls returns `false`, and then the caller's quad is unchanged.

## 3. Storage types

```ts
export type Box = Record<number, number>;
export type Space = Record<number, number>;
export type Quad = Record<number, number>;
export type Delta = Record<number, number>;
```

Each is caller-owned numeric storage. `[]` and a plain object work, as does a typed array with at least the type's number of slots that holds each written number exactly, such as a `Float64Array`. A `Float32Array` doesn't hold every number exactly. The aliases can't express capacity or precision, and no function validates the storage's kind, capacity or writability.

### 3.1 `Box`, eight slots

| Slots | Meaning |
| --- | --- |
| `[0]`–`[5]` | `a`, `b`, `c`, `d`, `e`, `f`: the affine matrix from the element's untransformed local border-box space into its document's viewport |
| `[6]`, `[7]` | `width`, `height`: the untransformed border-box dimensions the matrix acts on |

The matrix is expressed in the viewport's own basis, so two boxes measured in the same document are directly comparable. A `Box` holds no element reference. It describes the layout at the moment `coordinates` ran.

### 3.2 `Space`, five slots

| Slots | Meaning |
| --- | --- |
| `[0]`–`[3]` | `a`, `b`, `c`, `d`: the linear part of the space the element inherits, composed from every flat-tree node strictly above it. The element's own transform and zoom are excluded. Translation is omitted, because a delta doesn't depend on it |
| `[4]` | `ancestorZoom`: the cumulative CSS `zoom` of the same nodes |

The linear part is the space in which a transform authored on the element acts, so inverting it turns a viewport delta into the translation to write. `ancestorZoom` is reported because `zoom`, unlike `transform`, is not escaped by the top layer: a consumer that promotes an element and positions it by matrix divides the inherited zoom back out. A `Space` holds no element reference. It describes the ancestry at the moment `ancestry` ran.

### 3.3 `Quad`, eight slots

```text
[0] p1.x  [1] p1.y
[2] p2.x  [3] p2.y
[4] p3.x  [5] p3.y
[6] p4.x  [7] p4.y
```

The points keep the identity of these source-local physical border corners:

```text
p1 ───── p2
│         │
p4 ───── p3
```

Before coordinate conversion they are:

```text
p1 = (0, 0)
p2 = (borderBoxWidth, 0)
p3 = (borderBoxWidth, borderBoxHeight)
p4 = (0, borderBoxHeight)
```

Transforms, negative scale, rotation, writing mode and text direction never sort or relabel the points.

### 3.4 `Delta`, two slots

`[0]` `x` and `[1]` `y`: a delta along the basis's local x and y axes.

## 4. Functions

### 4.1 `ancestry`

```ts
export function ancestry(element: HTMLElement, out: Space): boolean;
```

It writes the `Space` that `element` inherits: every flat-tree node strictly above it, reached through the assigned slot, the parent element or the shadow host, composed in CSS order. A `display: contents` node contributes its `zoom` and no transform.

**It never reads the element's own box.** It answers for an element that has no principal box of its own: one that is `display: contents`, fragmented across lines or disconnected. A disconnected element inherits the identity space.

It returns `false` when a node above the element is not representable in 2D ([artifact 3](03-failure-table.md)).

### 4.2 `coordinates`

```ts
export function coordinates(
  element: HTMLElement,
  out: Box,
  above?: Readonly<Space>,
): boolean;
```

It measures one element into `out`. It reads the element's client rects and its own computed style, composes the element's own transform and CSS `zoom` onto the space it inherits, and derives the untransformed border-box size that the resulting matrix acts on.

When the caller passes `above`, the element's own `ancestry`, the walk is not repeated. Without it, `coordinates` reads the ancestry itself. The two forms give the same result.

**Precondition:** `above` is this element's inherited space. A `Space` holds no element, so this can't be checked, and a space read from another element gives a wrong matrix with a `true` result.

It returns `false` for the source failures in [artifact 3](03-failure-table.md): no principal box, a fragmented box, geometry that isn't representable in 2D, or a non-finite result.

### 4.3 `projection`

```ts
export function projection(
  source: Readonly<Box>,
  out: Quad,
  relativeTo?: Readonly<Box>,
): boolean;
```

It writes the four border-box corners of `source` into `out`. Without `relativeTo` the corners are in viewport coordinates. With it, they are in the untransformed local border-box space of the element that `relativeTo` measured, computed as `inverse(relativeTo matrix) × source matrix`.

It reads no DOM, allocates nothing visible to the caller, and modifies neither `source` nor `relativeTo`.

**Precondition:** `source` and `relativeTo` were measured in the same viewport coordinate space, normally the same `Document`. A `Box` carries no document, so this can't be checked. Boxes from two documents give a result with no meaning.

It returns `false` when `relativeTo`'s matrix can't be inverted to finite values, or when a projected coordinate is not finite. For a valid source and no `relativeTo` it normally succeeds.

### 4.4 `localDelta`

```ts
export function localDelta(
  basis: Readonly<Space> | Readonly<Box>,
  dx: number,
  dy: number,
  out: Delta,
): boolean;
```

It converts the viewport delta `(dx, dy)` into the basis given by slots `[0]`–`[3]` of `basis`, and writes it to `out`. It reads no DOM and allocates nothing visible to the caller. The basis decides what the result means:

- **An element's `Space`,** from `ancestry`: the value to add to that element's `translate`, `left` or `top`. A `Space` excludes the element's own `zoom`, so for an element with its own `zoom` the caller divides the result by that `zoom`.
- **An element's `Box`,** from `coordinates`: the change in that element's own untransformed box, such as its `width` or `height`.

It returns `false` when the basis is singular or the result is not finite.

### 4.5 Results

Every function returns a boolean:

| Result | Meaning |
| --- | --- |
| `true` | Every slot of `out` was written |
| `false` | A recognized failure in [artifact 3](03-failure-table.md). Every observable value in `out` is exactly what it was at call entry |

The unchanged-output guarantee applies to the `false` result. Arguments that break the contract, and unexpected platform or implementation errors, are outside the boolean result, and no output state is promised when an exception escapes.

No function replaces or reallocates `out`. Every read is fresh: nothing is retained between public calls, so a caller that repairs geometry observes the repair at the next measurement.

## 5. Coordinate spaces

### 5.1 Viewport output

`projection` without `relativeTo` gives layout viewport coordinates. Values align with `clientX`/`clientY` and `getBoundingClientRect()`, including the current page and container scroll positions.

Fractional used border-box extents remain part of the rendered geometry. An implementation must not replace browser-observable fractional border edges with a lower-precision serialized CSS value.

### 5.2 Relative output

`projection` with a target's `Box` gives the target's local physical border-box space. The target element may be an ancestor, a descendant, an element on an unrelated branch or a shadow-tree participant. It is an `HTMLElement` in the same `Document`, and its own layout and geometry case is otherwise supported by the v1 matrix.

The one-box rule is necessary but not sufficient for a target. An unguaranteed layout doesn't become supported because its element is measured as a target, and a read using such a target stays unguaranteed.

The target's own local origin and axes before its transform are used. A source projected against its own `Box` therefore gives:

```text
0, 0,
borderBoxWidth, 0,
borderBoxWidth, borderBoxHeight,
0, borderBoxHeight
```

The target's space must be invertible. A non-invertible target fails even when the source and the target are the same `Box`.

### 5.3 Physical coordinates

Local x and y are physical, not logical:

- x increases toward the physical right;
- y increases toward the physical bottom;
- p1 is the physical top-left border corner.

This holds for vertical writing modes and RTL direction.

### 5.4 Transform reference boxes

Output is always expressed from the source's local physical border-box corners, but a CSS transform need not use that border box as its reference box.

V1 supports effective HTML transform reference spaces that resolve to:

- the element's border box;
- the element's content box.

`transform-origin` percentages and percentage translations, in both classic `transform` and individual `translate`, resolve against the effective transform reference box. A content-box reference also contributes the content box's physical offset from the local border-box origin before transform composition.

Authored `transform-box` syntax is not the classification boundary. If the browser's effective HTML reference space is a border box or a content box, it is supported. Other effective reference spaces are unguaranteed.

## 6. Degenerate geometry

An otherwise supported source with a principal border box may have zero width, zero height, or a transform that collapses its viewport projection. Its measurement and its viewport projection succeed, because its four transformed corner values are representable. A principal box alone doesn't promote an unnamed layout mode into the supported matrix.

When the same non-invertible `Box` is used as `relativeTo`, the projection fails. The distinction is between the representability of the source's points and the invertibility of the requested target space.

## 7. Realm and primitive requirements

- When `ancestry` or `coordinates` constructs a `DOMMatrix`, it comes from `element.ownerDocument.defaultView`. `projection` and `localDelta` construct no DOM geometry.
- Every function writes into the caller-supplied output and doesn't replace its realm or identity.
- The public output is always caller-owned numeric storage, never `DOMPoint`, `DOMMatrix` or `DOMQuad`.
- Native `Element.getBoxQuads()` is never called, even when present.
- A read wholly within one document is supported when that document is hosted in an iframe. Its viewport output uses that document's own layout viewport.
- A `Box` or `Space` carries no document. Combining storage measured in two documents is outside the contract (§4.3). It is not a recognized failure, and it is not a realm bridge.

The realm rule is observable for a same-document element created by another JavaScript realm, such as an adopted element: after adoption, the current owner document's constructors govern the measurement.

An environment without a usable owner-document window or `DOMMatrix` primitive doesn't produce a `false` result. It is an unsupported execution environment, and its ordinary platform or implementation error escapes.

## 8. Error boundary

A `false` result comes only from a failure that [artifact 3](03-failure-table.md) recognizes:

- geometry that isn't representable in 2D;
- an absent or fragmented principal box;
- a non-invertible target or basis;
- a non-finite result.

The implementation must not catch broadly:

- platform getter or method exceptions;
- unexpected `DOMMatrix` failures;
- implementation defects;
- arguments that break the contract.

It need not add runtime checks only to make malformed arguments throw. Normal JavaScript and platform behavior may surface such misuse.

## 9. Non-goals

The API does not expose:

- a single call that measures and projects; the composition is the caller's (§2);
- an element reference, a document or any other metadata inside storage;
- an output box other than the border box, which is distinct from the supported transform reference boxes;
- fragment lists;
- point, matrix or quad classes;
- a measurement cache of any kind;
- an allocating output wrapper;
- conversion between documents;
- native GeometryUtils compatibility.

## Change record

| Date | Section | Change |
| --- | --- | --- |
| 2026-11-20 | All | **Rewritten to describe the API the source exports** (`F-1`). The artifact defined one function, `(element: HTMLElement, out: Quad, relativeTo?: HTMLElement) => boolean`, which measured both elements and projected in one call, with `Quad` as its only type. Its name is in box-quad's record, [`plan.md`](../plan.md), under 2026-11-20. `162f300fa` split measurement from projection and made `relativeTo` a measured `Box`. `BQ-6`, `BQ-9` and the decisions of 2026-11-13 shaped the rest. The old §§4–8 survive as §§4.5–9. One rule changed with the split. The old §6 made crossing from one document to another a recognized `false`. A `Box` carries no document, so that is now a precondition of `projection` (§4.3), as the source's documentation and the `REL-10` test state |