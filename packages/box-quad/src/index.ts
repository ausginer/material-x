/**
 * One caller-owned box measurement, laid out as
 * `[a, b, c, d, e, f, width, height]`.
 *
 * - `a`…`f` — the affine matrix from the element's untransformed local
 *   border-box space into its document viewport. It is always expressed in the
 *   canonical viewport basis, so two boxes measured from the same document are
 *   directly comparable.
 * - `width`/`height` — the untransformed border-box dimensions the matrix acts
 *   on.
 *
 * These eight values are exactly what {@link projection} reads. What an element
 * *inherits* is a fact about its ancestry rather than about its box, so it is a
 * {@link Space} and not part of this.
 */
export type Box = Float64Array;

/** Required length of a {@link Box}. */
const BOX_LENGTH = 8;

const BOX_A = 0;
const BOX_B = 1;
const BOX_C = 2;
const BOX_D = 3;
const BOX_E = 4;
const BOX_F = 5;
const BOX_WIDTH = 6;
const BOX_HEIGHT = 7;

/**
 * One caller-owned inherited space, laid out as `[a, b, c, d, ancestorZoom]`.
 *
 * - `a`…`d` — the **linear part of the space the element inherits**:
 *   everything strictly above it in the flat tree, with its own transform and
 *   zoom excluded. This is the space a transform *authored on the element* acts
 *   in, so inverting it turns a viewport delta into the translation to write.
 *   Translation is omitted because a delta is unaffected by it.
 * - `ancestorZoom` — the cumulative CSS `zoom` of the same nodes. It is
 *   reported because `zoom`, unlike `transform`, is not escaped by the top
 *   layer: a consumer promoting an element and positioning it by matrix has to
 *   divide the inherited zoom back out.
 *
 * It holds no element reference and describes the ancestry at the moment
 * {@link ancestry} ran, exactly as a {@link Box} describes the layout at the
 * moment {@link coordinates} ran.
 */
export type Space = Float64Array;

/** Required length of a {@link Space}. */
const SPACE_LENGTH = 5;

const SPACE_A = 0;
const SPACE_B = 1;
const SPACE_C = 2;
const SPACE_D = 3;
const SPACE_ANCESTOR_ZOOM = 4;

/**
 * A projected border-box quad in p1, p2, p3, p4 physical-corner order,
 * `[x1, y1, x2, y2, x3, y3, x4, y4]`.
 */
export type Quad = Float64Array;

/** Required length of a {@link Quad}. */
const QUAD_LENGTH = 8;

/** Allocates storage for one {@link Box}. */
export const box = (): Box => new Float64Array(BOX_LENGTH);

/** Allocates storage for one {@link Space}. */
export const space = (): Space => new Float64Array(SPACE_LENGTH);

/** Allocates storage for one {@link Quad}. */
export const quad = (): Quad => new Float64Array(QUAD_LENGTH);

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
 * The flat parent. `host` is read off the root rather than tested with
 * `instanceof view.ShadowRoot`: only a shadow root carries one, so a document
 * or a detached fragment yields `undefined`.
 */
function flatParentOf(element: HTMLElement): HTMLElement | null {
  return (
    element.assignedSlot ??
    element.parentElement ??
    ((element.getRootNode() as ShadowRoot).host as HTMLElement | undefined) ??
    null
  );
}

/**
 * One flat-tree node's own linear contribution, its CSS `zoom` included.
 *
 * `false` is *not representable in 2D*; `undefined` is *contributes nothing*.
 * The zoom factor is passed in rather than read here because the two callers
 * account for it differently — an ancestor's accumulates into the space, the
 * measured element's does not — and it seeds the node because zoom applies
 * outside everything the element itself authors.
 *
 * A `display: contents` node generates no box and therefore takes no transform,
 * but its zoom still applies, which is why the seed is returned rather than
 * discarded.
 */
function composeNode(
  style: CSSStyleDeclaration,
  Matrix: typeof DOMMatrix,
  zoom: number,
): DOMMatrix | undefined | false {
  let node = zoom === 1 ? undefined : new Matrix().scaleSelf(zoom);

  if (style.display === 'contents') {
    return node;
  }

  if (style.perspective !== 'none' || style.transformStyle === 'preserve-3d') {
    return false;
  }

  const { rotate } = style;

  if (rotate !== 'none') {
    const angle = get2DRotation(rotate);

    if (angle === undefined) {
      return false;
    }

    (node ??= new Matrix()).rotateSelf(angle);
  }

  const { scale } = style;

  if (scale !== 'none') {
    const values = scale.split(' ');
    const scaleX = parse(values[0]!);
    const scaleY = parse(values[1] ?? values[0]!);

    if (values.length > 2 && parse(values[2]!) !== 1) {
      return false;
    }

    (node ??= new Matrix()).scaleSelf(scaleX, scaleY);
  }

  if (style.transform !== 'none') {
    const transform = new Matrix(style.transform);

    if (!transform.is2D) {
      return false;
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
      return false;
    }
  }

  return node;
}

/**
 * A CSS `zoom` that scales, or `1`. `zoom > 0` doubles as the NaN guard — an
 * unparsable value is not a zoom.
 */
function zoomOf(style: CSSStyleDeclaration): number {
  const zoom = parse(style.zoom);

  return zoom > 0 ? zoom : 1;
}

/**
 * Reads the space `element` inherits into `out`: the linear part of every
 * flat-tree node strictly above it, composed, together with the cumulative CSS
 * `zoom` of those same nodes.
 *
 * **It never touches the element's own box.** It reads computed style walking
 * upward and takes no layout, so it answers for an element that has no
 * principal box of its own — one that is `display: contents`, fragmented across
 * lines, or disconnected — where {@link coordinates} must refuse.
 *
 * Returns `false` and leaves `out` **untouched** when some ancestor is not
 * representable in 2D: a 3D transform, `perspective`, or `preserve-3d`. That is
 * a recognized limit, not an error.
 */
export function ancestry(element: HTMLElement, out: Space): boolean {
  const view = element.ownerDocument.defaultView!;
  const Matrix = view.DOMMatrix;
  const matrix = new Matrix();
  let current = flatParentOf(element);
  let ancestorZoom = 1;

  while (current) {
    const style = view.getComputedStyle(current);
    const zoom = zoomOf(style);
    const node = composeNode(style, Matrix, zoom);

    if (node === false) {
      return false;
    }

    ancestorZoom *= zoom;

    if (node) {
      matrix.preMultiplySelf(node);
    }

    current = flatParentOf(current);
  }

  out[SPACE_A] = matrix.a;
  out[SPACE_B] = matrix.b;
  out[SPACE_C] = matrix.c;
  out[SPACE_D] = matrix.d;
  out[SPACE_ANCESTOR_ZOOM] = ancestorZoom;
  return true;
}

/**
 * Measures one element into `out`. This is the only operation that touches
 * layout.
 *
 * It reads the element's client rect and its own computed style, composes its
 * own transform and CSS `zoom` onto the space it inherits, and derives the
 * untransformed border-box size the resulting matrix acts on.
 *
 * Pass `above` — the element's own {@link ancestry} — when you already hold it,
 * and the walk is not repeated. Omitting it reads the ancestry internally, so
 * the two forms differ only in who owns the intermediate value.
 *
 * **Precondition:** `above` must be *this* element's inherited space. Nothing
 * can check that: a `Space` is a caller-owned numeric array holding no element,
 * so a space read from somewhere else produces a confidently wrong matrix, in
 * the same way {@link projection}'s same-viewport requirement does.
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
  above?: Space,
): boolean {
  const view = element.ownerDocument.defaultView!;
  // A disconnected element has no principal box, so it is already covered by
  // the rect count below and needs no separate `isConnected` probe.
  const rects = element.getClientRects();

  if (rects.length !== 1) {
    return false;
  }

  let inherited = above;

  if (!inherited) {
    inherited = space();

    if (!ancestry(element, inherited)) {
      return false;
    }
  }

  const style = view.getComputedStyle(element);
  const node = composeNode(style, view.DOMMatrix, zoomOf(style));

  if (node === false) {
    return false;
  }

  const ia = inherited[SPACE_A]!;
  const ib = inherited[SPACE_B]!;
  const ic = inherited[SPACE_C]!;
  const id = inherited[SPACE_D]!;
  // inherited × own, by scalar product rather than a second `DOMMatrix`
  // accumulator. An element contributing nothing keeps the inherited part
  // exactly, since the identity's terms drop out.
  const na = node ? node.a : 1;
  const nb = node ? node.b : 0;
  const nc = node ? node.c : 0;
  const nd = node ? node.d : 1;
  const a = ia * na + ic * nb;
  const b = ib * na + id * nb;
  const c = ia * nc + ic * nd;
  const d = ib * nc + id * nd;
  const rect = rects[0]!;
  const absoluteA = abs(a);
  const absoluteB = abs(b);
  const absoluteC = abs(c);
  const absoluteD = abs(d);
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

  // One sum stands in for eight checks: it is finite exactly when every term
  // is, since any NaN or infinity poisons it (and `Infinity - Infinity` is
  // NaN). `e` and `f` are omitted — they are finite whenever the linear part
  // and the size are, as a client rect is always finite.
  if (!finite(a + b + c + d + width + height)) {
    return false;
  }

  out[BOX_A] = a;
  out[BOX_B] = b;
  out[BOX_C] = c;
  out[BOX_D] = d;
  out[BOX_E] = rect.left - min(0, a * width) - min(0, c * height);
  out[BOX_F] = rect.top - min(0, b * width) - min(0, d * height);
  out[BOX_WIDTH] = width;
  out[BOX_HEIGHT] = height;
  return true;
}

/**
 * Projects a measured box's four border-box corners into `out`. Pure: no DOM
 * reads, no allocation.
 *
 * Without `relativeTo`, the corners land in viewport coordinates. With it, they
 * land in `relativeTo`'s **untransformed local border-box space**, computed as
 * `inverse(relativeTo.matrix) × source.matrix`.
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

  // As in `coordinates`, one sum covers every corner. `x3`/`y3` are omitted:
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
