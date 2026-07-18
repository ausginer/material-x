/**
 * Coordinate mapping between viewport space and a consumer-selected local space.
 *
 * Active pointer tracking stays in viewport space (raw `clientX`/`clientY`); the
 * matrix machinery here is used only at discrete moments — grab, drop, settle —
 * to map the reported geometry, size the placeholder, and aim the landing, so no
 * matrix traversal ever runs in the pointer-move hot path.
 *
 * {@link viewportMatrix} composes the full local→viewport transform of an
 * element by walking its `offsetParent` chain: each step folds in that element's
 * layout position, `zoom`, and CSS `transform` (about its `transform-origin`).
 * Because any transformed element is itself an `offsetParent`, the intermediate
 * elements a single `offsetLeft`/`offsetTop` skips over are always transform-free,
 * so the layout offsets stay valid under arbitrarily nested transforms —
 * translate, scale (including non-uniform), rotate, skew, `matrix()`, and zoom.
 */
import type { CoordinateMapper, Point } from './types.ts';

/** A mapper that leaves points and deltas untouched (no transform context). */
export const IDENTITY_MAPPER: CoordinateMapper = {
  toViewport(point: Point) {
    return point;
  },
  fromViewport(point: Point) {
    return point;
  },
  deltaFromViewport(delta: Point) {
    return delta;
  },
};

/** The two `transform-origin` offsets, resolved to pixels by the computed style. */
function origin(style: CSSStyleDeclaration): Point {
  const parts = style.transformOrigin.split(' ');
  return {
    x: Number.parseFloat(parts[0] ?? '0'),
    y: Number.parseFloat(parts[1] ?? '0'),
  };
}

/** An element's own CSS transform, taken about its transform-origin. */
function ownTransform(style: CSSStyleDeclaration): DOMMatrix {
  if (style.transform === 'none') {
    return new DOMMatrix();
  }

  const { x, y } = origin(style);

  return new DOMMatrix()
    .translateSelf(x, y)
    .multiplySelf(new DOMMatrix(style.transform))
    .translateSelf(-x, -y);
}

/**
 * The transform mapping `element`'s border-box local space (origin at its
 * top-left border corner, CSS-pixel axes) to viewport coordinates, with the
 * element's own transform applied. Points map as `matrix.transformPoint(p)`.
 */
export function viewportMatrix(element: HTMLElement): DOMMatrix {
  let matrix = new DOMMatrix();
  let node: Element | null = element;

  while (node instanceof HTMLElement) {
    const style = getComputedStyle(node);
    const offsetParent: Element | null = node.offsetParent;
    const zoom = Number.parseFloat(style.zoom) || 1;

    // node-local (post its own transform) → offsetParent border-box space.
    const step = new DOMMatrix();

    if (offsetParent instanceof HTMLElement) {
      // `offsetLeft`/`offsetTop` are relative to the offsetParent's padding
      // edge, so re-add its border, then subtract its scroll.
      step
        .translateSelf(offsetParent.clientLeft, offsetParent.clientTop)
        .translateSelf(-offsetParent.scrollLeft, -offsetParent.scrollTop);
    }

    step
      .translateSelf(node.offsetLeft, node.offsetTop)
      .scaleSelf(zoom)
      .multiplySelf(ownTransform(style));

    matrix = step.multiply(matrix);
    node = offsetParent;
  }

  // Fold in document scrolling once the chain reaches the root.
  return new DOMMatrix().translateSelf(-scrollX, -scrollY).multiply(matrix);
}

/** Drops the translation of `matrix`, leaving only its linear (2×2) part. */
function linearOf(matrix: DOMMatrix): DOMMatrix {
  return new DOMMatrix([matrix.a, matrix.b, matrix.c, matrix.d, 0, 0]);
}

const pointOf = (mapped: DOMPoint): Point => ({ x: mapped.x, y: mapped.y });

/**
 * A {@link CoordinateMapper} over `element`'s local space, capturing its
 * transform to the viewport once. The capture is a snapshot: it is taken at grab
 * time and reused through the gesture, so scrolling or transform changes during a
 * drag are handled by re-deriving geometry, not by re-reading the matrix per move.
 */
export function createMapper(element: HTMLElement): CoordinateMapper {
  const matrix = viewportMatrix(element);
  const inverse = matrix.inverse();
  const inverseLinear = linearOf(inverse);

  return {
    toViewport(point) {
      return pointOf(matrix.transformPoint(new DOMPoint(point.x, point.y)));
    },
    fromViewport(point) {
      return pointOf(inverse.transformPoint(new DOMPoint(point.x, point.y)));
    },
    deltaFromViewport(delta) {
      return pointOf(
        inverseLinear.transformPoint(new DOMPoint(delta.x, delta.y)),
      );
    },
  };
}
