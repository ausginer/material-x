# @ydinjs/box-quad

Border-box quads of transformed, zoomed and scrolled HTML elements, read into storage the caller owns.

It measures one `HTMLElement` that has one unfragmented principal box, through 2D transforms, CSS `zoom` and scrolling. It gives the element's border-box corners in viewport coordinates or relative to another element, and turns a pointer delta into the translation to write to an element. It isn't a `getBoxQuads()` polyfill, and it never calls the native `getBoxQuads()`.

## Installation

```bash
npm install @ydinjs/box-quad
```

## Usage

Measure two elements, and project one into the other's untransformed local border-box space:

```ts
import { coordinates, projection } from '@ydinjs/box-quad';

const card = new Float64Array(8);
const board = new Float64Array(8);
const corners = new Float64Array(8);

if (
  coordinates(cardElement, card) &&
  coordinates(boardElement, board) &&
  projection(card, corners, board)
) {
  // corners[0], corners[1] is the card's local origin corner in the board's
  // local space; corners[4], corners[5] is the opposite corner.
}
```

Turn a pointer delta into the translation to write to a dragged element:

```ts
import { ancestry, localDelta } from '@ydinjs/box-quad';

const space = new Float64Array(5);
const delta = new Float64Array(2);
let x = 0;
let y = 0;

dragged.addEventListener('pointermove', (event) => {
  if (
    ancestry(dragged, space) &&
    localDelta(space, event.movementX, event.movementY, delta)
  ) {
    x += delta[0];
    y += delta[1];
    dragged.style.translate = `${x}px ${y}px`;
  }
});
```

## Storage

Each function writes into storage that the caller owns, and returns `true`. Or it returns `false` and leaves the storage untouched. An empty `[]`, a plain object and a `Float64Array` of the stated length all work, and one store can be reused for every call.

| Type | Written by | Slots |
| --- | --- | --- |
| `Box` | `coordinates` | 8: the matrix `a`, `b`, `c`, `d`, `e`, `f` from the element's local border-box space into the viewport, then `width`, `height` |
| `Space` | `ancestry` | 5: the linear part `a`, `b`, `c`, `d` of the space the element inherits, then the ancestors' cumulative `zoom` |
| `Quad` | `projection` | 8: `x1`, `y1` to `x4`, `y4`, the corners p1 (the local origin), p2 (along local x), p3 (opposite p1) and p4 (along local y) |
| `Delta` | `localDelta` | 2: `x`, `y`, the delta along the basis's local axes |

- `ancestry(element, out)` reads the space that `element` inherits from everything above it. It takes no layout, so it also answers for an element with no box of its own.
- `coordinates(element, out, above?)` measures the element. It is the only function that reads layout. Pass the element's own `Space` as `above` when you already have it.
- `projection(source, out, relativeTo?)` projects a measured box's corners into the viewport, or into `relativeTo`'s local space.
- `localDelta(basis, dx, dy, out)` converts a viewport delta into a basis. With a `Space`, the result is the value to write to that element's `translate`, `left` or `top`, divided by the element's own `zoom` if it has one. With a `Box`, it is the change in that element's own untransformed box.

## Preconditions

The types can't state these two, and nothing checks them:

- **A `Space` passed to `coordinates` as `above` must be that element's own.** A space read from another element gives a wrong matrix.
- **The two boxes passed to `projection` must come from the same viewport,** normally the same document. Boxes from different documents give a wrong result.

## What is supported

Supported:

- block, inline-block, flex and grid boxes, replaced elements such as `img`, and every kind of positioning, sticky included;
- zero-size boxes, borders, either `box-sizing`, `display: contents` ancestors, any writing mode and direction (corners are physical);
- 2D transforms in any form: the `transform` functions, the individual `translate`, `rotate` and `scale` properties, `transform-origin` and `transform-box`, nested and combined;
- CSS `zoom` on the element, its ancestors and the target, with transforms and scrolling;
- page and nested scrolling, open and closed shadow trees, slotted elements, and a source and target on either side of a shadow boundary;
- a target that is an ancestor, a descendant, an unrelated element or the element itself;
- reads within one iframe's document.

The function returns `false` for:

- an inline element split across lines, or another box with more than one client rect;
- a 3D transform, `perspective`, or `transform-style: preserve-3d` that applies;
- a `relativeTo` box whose matrix can't be inverted;
- a disconnected element, or one without a principal box;
- a result that isn't finite.

Other fragmented boxes aren't supported either, and the caller keeps them out. The function finds fragmentation only by the client rect count, so a fragmented box with one client rect doesn't return `false`, and its result isn't guaranteed.

There is no option for a box other than the border box, and no list of fragments.

## Browser support

The current stable release of Chromium, Firefox and Safari. No minimum version is promised: a browser version that leaves stable leaves support, and that isn't a breaking change.

## API reference

<https://ausginer.github.io/material-x/api/box-quad/>

## License

Apache-2.0