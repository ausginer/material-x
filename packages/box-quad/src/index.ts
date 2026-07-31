/**
 * One caller-owned box measurement, laid out as
 * `[a, b, c, d, e, f, width, height, ancestorZoom]`.
 *
 * - `a`…`f` — the affine matrix from the element's untransformed local
 *   border-box space into its document viewport. It is always expressed in the
 *   canonical viewport basis, so two boxes measured from the same document are
 *   directly comparable.
 * - `width`/`height` — the untransformed border-box dimensions the matrix acts
 *   on.
 * - `ancestorZoom` — the cumulative CSS `zoom` of the element's flat-tree
 *   ancestors, **excluding its own**, which the matrix already carries. Because
 *   the matrix basis is always the viewport, this value has one stable meaning
 *   and is unaffected by any later relative projection.
 *
 *   It is reported separately because `zoom`, unlike `transform`, is not escaped
 *   by the top layer: a consumer promoting an element and positioning it by
 *   matrix has to divide the inherited zoom back out.
 * - `ancestorA`…`ancestorD` — the **linear part of the inherited space**:
 *   everything strictly above the element, with its own transform and zoom
 *   excluded. This is the space a transform *authored on the element* acts in,
 *   so inverting it turns a viewport delta into the translation to write.
 *   Translation is omitted because a delta is unaffected by it.
 *
 * The last five values are metadata for consumers that author transforms on the
 * measured element, in the same way `ancestorZoom` is; {@link projection} reads
 * only the first eight. They are here rather than derivable by the caller
 * because obtaining them otherwise means a second traversal and a second copy
 * of the flat-tree, shadow-root and `display: contents` rules this package
 * exists to own.
 */
export type Box = Float64Array;

/** Required length of a {@link Box}. */
const BOX_LENGTH = 13;

const BOX_A = 0;
const BOX_B = 1;
const BOX_C = 2;
const BOX_D = 3;
const BOX_E = 4;
const BOX_F = 5;
const BOX_WIDTH = 6;
const BOX_HEIGHT = 7;
const BOX_ANCESTOR_ZOOM = 8;
const BOX_ANCESTOR_A = 9;
const BOX_ANCESTOR_B = 10;
const BOX_ANCESTOR_C = 11;
const BOX_ANCESTOR_D = 12;

/**
 * A projected border-box quad in p1, p2, p3, p4 physical-corner order,
 * `[x1, y1, x2, y2, x3, y3, x4, y4]`.
 */
export type Quad = Float64Array;

/** Required length of a {@link Quad}. */
const QUAD_LENGTH = 8;

/** Allocates storage for one {@link Box}. */
export const box = (): Box => new Float64Array(BOX_LENGTH);

/** Allocates storage for one {@link Quad}. */
export const quad = (): Quad => new Float64Array(QUAD_LENGTH);

/**
 * A measurement epoch. Calling it ends the current epoch and starts a fresh
 * one; the identity stays valid, so a long-lived consumer holds one cache and
 * re-calls it rather than reallocating.
 *
 * A cache is a promise that layout has not changed since it was last called.
 * The library cannot detect layout invalidation, so releasing that promise is
 * the caller's job: re-call it whenever anything that could move an element
 * happens — a scroll, a resize, a DOM move, a style write.
 */
export type BoxCache = () => void;

type Space = LinearSpace &
  Readonly<{
    ownerDocument: Document;
    width: number;
    height: number;
  }>;

type InternalCache = BoxCache & {
  e: WeakMap<HTMLElement, Space>;
};

export function cache(): BoxCache {
  const clear = (() => {
    clear.e = new WeakMap();
  }) as InternalCache;

  clear();

  return clear;
}

// Hoisted so the minifier can mangle each call site down to one identifier.
// `finite` is deliberately not named `isFinite`: the global of that name
// coerces its argument, and these must not.
const { parseFloat: parse, isFinite: finite } = Number;
const { abs, min } = Math;

/**
 * The border-box extent along one axis, used only when the matrix is too
 * degenerate to invert the client rect back into local space.
 *
 * A non-finite `value` needs no early return: every branch below propagates it,
 * and the caller rejects the whole measurement on the finiteness check.
 */
function getBorderSize(
  style: CSSStyleDeclaration,
  dimension: 'width' | 'height',
  start: 'Left' | 'Top',
  end: 'Right' | 'Bottom',
): number {
  const value = parse(style[dimension]);

  return style.boxSizing === 'border-box'
    ? value
    : value +
        parse(style[`padding${start}`]) +
        parse(style[`padding${end}`]) +
        parse(style[`border${start}Width`]) +
        parse(style[`border${end}Width`]);
}

function get2DRotation(value: string): number | undefined {
  const values = value.split(' ');
  const angle = parse(values.at(-1)!);

  // A single component is a bare z rotation. Anything else names an axis, and
  // only a full turn about it is representable in 2D.
  return values.length === 1 ? angle : angle % 360 === 0 ? 0 : undefined;
}

/**
 * The linear part of the element→viewport transform, plus the cumulative zoom
 * of everything above the element.
 *
 * Both come out of the **same** flat-tree walk. They are separate outputs of
 * one traversal rather than two reads, because a second walk could observe a
 * different layout and disagree with the first.
 */
type LinearSpace = Readonly<{
  matrix: DOMMatrix;
  /** Everything strictly above the element, linear part only. */
  ancestorMatrix: DOMMatrix;
  ancestorZoom: number;
}>;

function composeLinearMatrix(
  element: HTMLElement,
  firstStyle: CSSStyleDeclaration,
  view: Window & typeof globalThis,
): LinearSpace | undefined {
  const Matrix = view.DOMMatrix;
  const result = new Matrix();
  const ancestorMatrix = new Matrix();
  let current: HTMLElement | null = element;
  let style = firstStyle;
  let ancestorZoom = 1;

  while (current) {
    const zoom = parse(style.zoom);
    // `zoom > 0` doubles as the NaN guard — an unparsable value is not a zoom.
    const hasZoom = zoom !== 1 && zoom > 0;

    if (hasZoom && current !== element) {
      // The element's own zoom belongs to the matrix alone. Only what it
      // *inherits* is reported separately.
      ancestorZoom *= zoom;
    }

    let node = hasZoom ? new Matrix().scaleSelf(zoom) : undefined;

    if (style.display !== 'contents') {
      if (
        style.perspective !== 'none' ||
        style.transformStyle === 'preserve-3d'
      ) {
        return;
      }

      const { rotate } = style;

      if (rotate !== 'none') {
        const angle = get2DRotation(rotate);

        if (angle === undefined) {
          return;
        }

        (node ??= new Matrix()).rotateSelf(angle);
      }

      const { scale } = style;

      if (scale !== 'none') {
        const values = scale.split(' ');
        const scaleX = parse(values[0]!);
        const scaleY = parse(values[1] ?? values[0]!);

        if (values.length > 2 && parse(values[2]!) !== 1) {
          return;
        }

        (node ??= new Matrix()).scaleSelf(scaleX, scaleY);
      }

      if (style.transform !== 'none') {
        const transform = new Matrix(style.transform);

        if (!transform.is2D) {
          return;
        }

        if (node) {
          node.multiplySelf(transform);
        } else {
          node = transform;
        }
      }

      const { translate } = style;

      if (translate !== 'none') {
        const values = translate.split(' ');

        if (values.length > 2 && parse(values[2]!) !== 0) {
          return;
        }
      }
    }

    if (node) {
      result.preMultiplySelf(node);

      if (current !== element) {
        ancestorMatrix.preMultiplySelf(node);
      }
    }

    // The flat parent. `host` is read off the root rather than tested with
    // `instanceof view.ShadowRoot`: only a shadow root carries one, so a
    // document or a detached fragment yields `undefined`.
    current =
      current.assignedSlot ??
      current.parentElement ??
      ((current.getRootNode() as ShadowRoot).host as HTMLElement | undefined) ??
      null;

    if (current) {
      style = view.getComputedStyle(current);
    }
  }

  return { matrix: result, ancestorMatrix, ancestorZoom };
}

function createSpace(element: HTMLElement): Space | undefined {
  const { ownerDocument } = element;
  const view = ownerDocument.defaultView!;
  // A disconnected element has no principal box, so it is already covered by
  // the rect count below and needs no separate `isConnected` probe.
  const rects = element.getClientRects();

  if (rects.length !== 1) {
    return;
  }

  const rect = rects[0]!;
  const style = view.getComputedStyle(element);
  const linear = composeLinearMatrix(element, style, view);

  if (!linear) {
    return;
  }

  const { matrix } = linear;
  const absoluteA = abs(matrix.a);
  const absoluteB = abs(matrix.b);
  const absoluteC = abs(matrix.c);
  const absoluteD = abs(matrix.d);
  const diagonal = absoluteA * absoluteD;
  const antiDiagonal = absoluteB * absoluteC;
  const determinant = diagonal - antiDiagonal;
  const determinantScale = diagonal + antiDiagonal;
  let width: number;
  let height: number;

  // Fall back before AABB inversion significantly amplifies input error.
  if (abs(determinant) > determinantScale * 0.05) {
    width = (rect.width * absoluteD - rect.height * absoluteC) / determinant;
    height = (rect.height * absoluteA - rect.width * absoluteB) / determinant;
  } else {
    width = getBorderSize(style, 'width', 'Left', 'Right');
    height = getBorderSize(style, 'height', 'Top', 'Bottom');
  }

  matrix.e = rect.left - min(0, matrix.a * width) - min(0, matrix.c * height);
  matrix.f = rect.top - min(0, matrix.b * width) - min(0, matrix.d * height);

  // One sum stands in for eight checks: it is finite exactly when every term
  // is, since any NaN or infinity poisons it (and `Infinity - Infinity` is
  // NaN). `e` and `f` are omitted — they are finite whenever the linear part
  // and the size are, as a client rect is always finite.
  if (!finite(matrix.a + matrix.b + matrix.c + matrix.d + width + height)) {
    return;
  }

  // The linear result is already the bulk of a `Space`; widening it in place
  // beats copying six fields into a fresh object literal.
  return Object.assign(linear, { ownerDocument, width, height });
}

/**
 * Measures one element into `out`. This is the only operation that touches the
 * DOM.
 *
 * It reads the element's layout, walks the flat tree once, composes every
 * transform and CSS `zoom` into the canonical element→viewport matrix, derives
 * the untransformed border-box size, and records the inherited zoom and linear
 * basis.
 * When a cache is supplied, a measurement taken in the current epoch is reused
 * instead of repeating the walk.
 *
 * Returns `false` and leaves `out` **untouched** for geometry this library does
 * not model: a disconnected element, a fragmented one (`getClientRects()`
 * length other than 1), 3D transforms, `perspective`, `preserve-3d`, or a
 * non-finite result. A `false` return is a recognized limit, not an error;
 * unexpected platform exceptions are allowed to escape.
 *
 * There is deliberately no `relativeTo` here. Relative coordinates are not a
 * measurement concern — they are a basis conversion between two boxes that have
 * already been measured, which is {@link projection}.
 */
export function coordinates(
  element: HTMLElement,
  out: Box,
  recache?: BoxCache,
): boolean {
  const entries = (recache as InternalCache | undefined)?.e;
  let space = entries?.get(element);

  // An entry measured against another document survived an adoption, so its
  // viewport basis is no longer the element's.
  if (space?.ownerDocument !== element.ownerDocument) {
    space = createSpace(element);

    if (space) {
      entries?.set(element, space);
    }
  }

  if (!space) {
    return false;
  }

  const { matrix } = space;

  out[BOX_A] = matrix.a;
  out[BOX_B] = matrix.b;
  out[BOX_C] = matrix.c;
  out[BOX_D] = matrix.d;
  out[BOX_E] = matrix.e;
  out[BOX_F] = matrix.f;
  out[BOX_WIDTH] = space.width;
  out[BOX_HEIGHT] = space.height;
  out[BOX_ANCESTOR_ZOOM] = space.ancestorZoom;

  const { ancestorMatrix } = space;

  out[BOX_ANCESTOR_A] = ancestorMatrix.a;
  out[BOX_ANCESTOR_B] = ancestorMatrix.b;
  out[BOX_ANCESTOR_C] = ancestorMatrix.c;
  out[BOX_ANCESTOR_D] = ancestorMatrix.d;
  return true;
}

/**
 * Projects a measured box's four border-box corners into `out`. Pure: no DOM
 * reads, no cache, no allocation.
 *
 * Without `relativeTo`, the corners land in viewport coordinates. With it, they
 * land in `relativeTo`'s **untransformed local border-box space**, computed as
 * `inverse(relativeTo.matrix) × source.matrix`.
 *
 * `ancestorZoom` is ignored — zoom is already represented in both matrices.
 *
 * Returns `false` and leaves `out` untouched when `relativeTo`'s matrix is
 * singular or any projected coordinate is non-finite. For a valid source with
 * no `relativeTo` this is normally infallible; the check is retained so the
 * numeric boundary stays explicit.
 *
 * **Precondition:** `source` and `relativeTo` must have been measured in the
 * same viewport coordinate space — normally the same `Document`. These are
 * caller-owned numeric arrays, so that is a documented requirement rather than
 * something hidden metadata could enforce.
 */
export function projection(source: Box, out: Quad, relativeTo?: Box): boolean {
  let a = source[BOX_A]!;
  let b = source[BOX_B]!;
  let c = source[BOX_C]!;
  let d = source[BOX_D]!;
  let e = source[BOX_E]!;
  let f = source[BOX_F]!;

  if (relativeTo) {
    const ta = relativeTo[BOX_A]!;
    const tb = relativeTo[BOX_B]!;
    const tc = relativeTo[BOX_C]!;
    const td = relativeTo[BOX_D]!;
    // Reciprocal once, then multiply: a singular or non-finite determinant
    // turns into a non-finite reciprocal, so this one test also covers it.
    const inverseDeterminant = 1 / (ta * td - tb * tc);

    if (!inverseDeterminant || !finite(inverseDeterminant)) {
      return false;
    }

    // inverse(relativeTo), by scalar cofactor rather than a `DOMMatrix` round
    // trip.
    const ia = td * inverseDeterminant;
    const ib = -tb * inverseDeterminant;
    const ic = -tc * inverseDeterminant;
    const id = ta * inverseDeterminant;
    const te = relativeTo[BOX_E]!;
    const tf = relativeTo[BOX_F]!;
    const ie = -(ia * te + ic * tf);
    const iff = -(ib * te + id * tf);

    // inverse(relativeTo) × source
    const sa = a;
    const sb = b;
    const sc = c;
    const sd = d;
    const se = e;
    const sf = f;

    a = ia * sa + ic * sb;
    b = ib * sa + id * sb;
    c = ia * sc + ic * sd;
    d = ib * sc + id * sd;
    e = ia * se + ic * sf + ie;
    f = ib * se + id * sf + iff;
  }

  const width = source[BOX_WIDTH]!;
  const height = source[BOX_HEIGHT]!;
  const x2 = a * width + e;
  const y2 = b * width + f;
  const x4 = c * height + e;
  const y4 = d * height + f;
  const x3 = x2 + x4 - e;
  const y3 = y2 + y4 - f;

  // As in `createSpace`, one sum covers every corner. `x3`/`y3` are omitted:
  // they are sums of terms already in the check.
  if (!finite(e + f + x2 + y2 + x4 + y4)) {
    return false;
  }

  out[0] = e;
  out[1] = f;
  out[2] = x2;
  out[3] = y2;
  out[4] = x3;
  out[5] = y3;
  out[6] = x4;
  out[7] = y4;
  return true;
}
