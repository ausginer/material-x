/**
 * Coordinate mapping between viewport space and a consumer-selected local space.
 *
 * Active pointer tracking stays in viewport space (raw `clientX`/`clientY`); the
 * matrix machinery here runs only at discrete moments — grab, drop, settle — to
 * map reported geometry, size the placeholder, and aim the landing, so no matrix
 * traversal ever runs in the pointer-move hot path.
 *
 * {@link viewportMatrix} composes the full local->viewport transform of an
 * element by walking its `offsetParent` chain: each step folds in that element's
 * layout position, `zoom`, and CSS `transform` (about its `transform-origin`).
 * Because any transformed element is itself an `offsetParent`, the intermediate
 * elements a single `offsetLeft`/`offsetTop` skips over are always transform-free.
 *
 * All realm-sensitive reads (`getComputedStyle`, scroll offsets, `DOMMatrix`,
 * `DOMPoint`) go through the owning {@link DOMRealm}.
 */
import type { DOMRealm } from './realm.ts';
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

/** The strictly-2D projection of a matrix, so no `multiply` ever mixes dims. */
const flat2d = (m: DOMMatrix, M: typeof DOMMatrix): DOMMatrix =>
  new M([m.a, m.b, m.c, m.d, m.e, m.f]);

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
 * `transform`, `zoom` is not escaped by the top layer, so a lifted visual
 * cancels this to render in true viewport pixels.
 */
export function ancestorZoom(element: HTMLElement, realm: DOMRealm): number {
  let zoom = 1;
  let node = element.parentElement;

  while (node) {
    zoom *= Number.parseFloat(realm.window.getComputedStyle(node).zoom) || 1;
    node = node.parentElement;
  }

  return zoom;
}

function cumulativeZoom(element: HTMLElement, realm: DOMRealm): number {
  return (
    (Number.parseFloat(realm.window.getComputedStyle(element).zoom) || 1) *
    ancestorZoom(element, realm)
  );
}

/** An element's own CSS transform, taken about its transform-origin. */
function ownTransform(style: CSSStyleDeclaration, realm: DOMRealm): DOMMatrix {
  const M = realm.window.DOMMatrix;

  if (style.transform === 'none') {
    return new M();
  }

  const { x, y } = origin(style);

  // Flatten the authored transform to its 2D projection before composing: drag
  // positioning lives in the viewport plane, and some engines refuse to multiply
  // a 2D matrix by a `matrix3d(...)` operand at all, so every matrix in the chain
  // is kept strictly 2D.
  const t = new M(style.transform);
  const flat = new M([t.a, t.b, t.c, t.d, t.e, t.f]);
  return flat2d(
    new M().translateSelf(x, y).multiply(flat).translateSelf(-x, -y),
    M,
  );
}

/**
 * The transform mapping `element`'s border-box local space to viewport
 * coordinates, with the element's own transform and cumulative `zoom` applied.
 */
export function viewportMatrix(
  element: HTMLElement,
  realm: DOMRealm,
): DOMMatrix {
  const M = realm.window.DOMMatrix;
  let matrix = new M();
  let node: Element | null = element;
  let visitedZoom = 1;

  while (node instanceof realm.window.HTMLElement) {
    const style = realm.window.getComputedStyle(node);
    const offsetParent: Element | null = node.offsetParent;

    const step = new M();

    if (offsetParent instanceof realm.window.HTMLElement) {
      step
        .translateSelf(offsetParent.clientLeft, offsetParent.clientTop)
        .translateSelf(-offsetParent.scrollLeft, -offsetParent.scrollTop);
    }

    const zoom = Number.parseFloat(style.zoom) || 1;
    step.scaleSelf(zoom);
    visitedZoom *= zoom;

    step.translateSelf(node.offsetLeft, node.offsetTop);

    matrix = flat2d(
      flat2d(step, M).multiply(ownTransform(style, realm)).multiply(matrix),
      M,
    );
    node = offsetParent;
  }

  matrix = new M()
    .translateSelf(-realm.window.scrollX, -realm.window.scrollY)
    .multiply(matrix);

  const gap = cumulativeZoom(element, realm) / visitedZoom;

  if (gap !== 1) {
    matrix = new M().scaleSelf(gap).multiply(matrix);
  }

  return matrix;
}

/**
 * A {@link CoordinateMapper} over `element`'s local space, capturing its
 * transform to the viewport once. The capture is a snapshot taken at the
 * required discrete moment and reused through the gesture.
 *
 * The six affine coefficients are read out of the captured matrices once, so the
 * warm mapping calls are plain scalar arithmetic — no per-call `DOMPoint`
 * allocation and no `transformPoint` dispatch. A 2D point maps as
 * `(a·x + c·y + e, b·x + d·y + f)`; a delta drops the translation (`e`/`f`),
 * which is why `deltaFromViewport` uses the inverse's linear part alone.
 */
export function createMapper(
  element: HTMLElement,
  realm: DOMRealm,
): CoordinateMapper {
  const matrix = viewportMatrix(element, realm);
  const inverse = matrix.inverse();
  const { a, b, c, d, e, f } = matrix;
  const { a: ia, b: ib, c: ic, d: id, e: ie, f: iff } = inverse;

  return {
    toViewport(point) {
      return {
        x: a * point.x + c * point.y + e,
        y: b * point.x + d * point.y + f,
      };
    },
    fromViewport(point) {
      return {
        x: ia * point.x + ic * point.y + ie,
        y: ib * point.x + id * point.y + iff,
      };
    },
    deltaFromViewport(delta) {
      return { x: ia * delta.x + ic * delta.y, y: ib * delta.x + id * delta.y };
    },
  };
}
