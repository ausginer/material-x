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

/**
 * The cumulative CSS `zoom` of `element`'s ancestors, excluding its own. Unlike
 * `transform`, `zoom` is not escaped by the top layer — it compounds onto a
 * lifted element through the DOM ancestry — so a lifted visual cancels this to
 * render in true viewport pixels.
 */
export function ancestorZoom(element: HTMLElement): number {
  let zoom = 1;
  let node = element.parentElement;

  while (node) {
    zoom *= Number.parseFloat(getComputedStyle(node).zoom) || 1;
    node = node.parentElement;
  }

  return zoom;
}

/**
 * The cumulative CSS `zoom` scaling `element` on screen — its own `zoom` times
 * {@link ancestorZoom}. Used to reconcile the zoom the `offsetParent` walk in
 * {@link viewportMatrix} skips over (a static zoomed ancestor is not an
 * `offsetParent`).
 */
function cumulativeZoom(element: HTMLElement): number {
  return (
    (Number.parseFloat(getComputedStyle(element).zoom) || 1) *
    ancestorZoom(element)
  );
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
 * element's own transform and cumulative `zoom` applied. Points map as
 * `matrix.transformPoint(p)`.
 *
 * Accumulates up the `offsetParent` chain, folding in each element's layout
 * position, `zoom`, and CSS transform (about its origin). Because any
 * transformed element is itself an `offsetParent`, the intermediate elements a
 * single `offsetLeft`/`offsetTop` skips over are always transform-free, so the
 * layout offsets stay valid under arbitrarily nested transforms.
 */
export function viewportMatrix(element: HTMLElement): DOMMatrix {
  let matrix = new DOMMatrix();
  let node: Element | null = element;
  // Product of the `zoom` folded in along the way, so the skipped-ancestor gap
  // below can be reconciled against the true cumulative zoom.
  let visitedZoom = 1;

  while (node instanceof HTMLElement) {
    const style = getComputedStyle(node);
    const offsetParent: Element | null = node.offsetParent;

    // node-local (post its own transform) → offsetParent border-box space.
    const step = new DOMMatrix();

    if (offsetParent instanceof HTMLElement) {
      // `offsetLeft`/`offsetTop` are relative to the offsetParent's padding
      // edge, so re-add its border, then subtract its scroll.
      step
        .translateSelf(offsetParent.clientLeft, offsetParent.clientTop)
        .translateSelf(-offsetParent.scrollLeft, -offsetParent.scrollTop);
    }

    // A node's own `zoom` scales its content *and* its layout offset (a
    // `zoom: 2; left: 20px` box renders its left edge at 40), so the scale wraps
    // the offset translate rather than following it.
    const zoom = Number.parseFloat(style.zoom) || 1;
    step.scaleSelf(zoom);
    visitedZoom *= zoom;

    step.translateSelf(node.offsetLeft, node.offsetTop);
    step.multiplySelf(ownTransform(style));

    matrix = step.multiply(matrix);
    node = offsetParent;
  }

  // Fold in document scrolling once the chain reaches the root.
  matrix = new DOMMatrix().translateSelf(-scrollX, -scrollY).multiply(matrix);

  // A static zoomed ancestor is not an `offsetParent`, so the walk above steps
  // straight over it and never folds its `zoom` in — `offsetLeft`/`offsetTop`
  // are reported in unzoomed layout units. Reconcile that gap by scaling the
  // whole result by the cumulative zoom the walk missed. (Uniform `zoom` scales
  // descendant geometry about the zoomed box; this approximates it about the
  // viewport origin, exact when the zoomed ancestor sits at that origin.)
  const gap = cumulativeZoom(element) / visitedZoom;

  if (gap !== 1) {
    matrix = new DOMMatrix().scaleSelf(gap).multiply(matrix);
  }

  return matrix;
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
