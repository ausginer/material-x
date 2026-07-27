/** A source border-box quad in p1, p2, p3, p4 physical-corner order. */
export type Quad = Float64Array;

/** Caller-owned epoch map whose entries are opaque and library-owned. */
export type BoxQuadCache = WeakMap<HTMLElement, unknown>;

type Space = {
  readonly ownerDocument: Document;
  readonly matrix: DOMMatrix;
  readonly width: number;
  readonly height: number;
  inverse?: DOMMatrix | null;
};

type InternalCache = WeakMap<HTMLElement, Space>;

function getFlatParent(element: HTMLElement): HTMLElement | null {
  if (element.assignedSlot) {
    return element.assignedSlot;
  }

  if (element.parentElement) {
    return element.parentElement;
  }

  const root = element.getRootNode();
  return root instanceof element.ownerDocument.defaultView!.ShadowRoot
    ? (root.host as HTMLElement)
    : null;
}

function getBorderSize(
  style: CSSStyleDeclaration,
  dimension: 'width' | 'height',
): number {
  const value = Number.parseFloat(style[dimension]);

  if (!Number.isFinite(value)) {
    return value;
  }

  if (style.boxSizing === 'border-box') {
    return value;
  }

  if (dimension === 'width') {
    return (
      value +
      Number.parseFloat(style.paddingLeft) +
      Number.parseFloat(style.paddingRight) +
      Number.parseFloat(style.borderLeftWidth) +
      Number.parseFloat(style.borderRightWidth)
    );
  }

  return (
    value +
    Number.parseFloat(style.paddingTop) +
    Number.parseFloat(style.paddingBottom) +
    Number.parseFloat(style.borderTopWidth) +
    Number.parseFloat(style.borderBottomWidth)
  );
}

function get2DRotation(value: string): number | null {
  const values = value.split(' ');
  const angle = Number.parseFloat(values.at(-1)!);

  if (values.length === 1) {
    return angle;
  }

  if (
    Math.abs(Math.sin((angle * Math.PI) / 180)) < 1e-12 &&
    Math.abs(Math.cos((angle * Math.PI) / 180) - 1) < 1e-12
  ) {
    return 0;
  }

  return null;
}

function composeLinearMatrix(
  element: HTMLElement,
  firstStyle: CSSStyleDeclaration,
  view: Window & typeof globalThis,
): DOMMatrix | null {
  const Matrix = view.DOMMatrix;
  const result = new Matrix();
  let current: HTMLElement | null = element;
  let style = firstStyle;

  while (current) {
    const zoom = Number.parseFloat(style.zoom);
    let node =
      zoom !== 1 && !Number.isNaN(zoom)
        ? new Matrix().scaleSelf(zoom)
        : undefined;

    if (style.display !== 'contents') {
      if (
        style.perspective !== 'none' ||
        style.transformStyle === 'preserve-3d'
      ) {
        return null;
      }

      const { rotate } = style;

      if (rotate !== 'none') {
        const angle = get2DRotation(rotate);

        if (angle === null) {
          return null;
        }

        (node ??= new Matrix()).rotateSelf(angle);
      }

      const { scale } = style;

      if (scale !== 'none') {
        const values = scale.split(' ');
        const scaleX = Number.parseFloat(values[0]!);
        const scaleY = Number.parseFloat(values[1] ?? values[0]!);

        if (values.length > 2 && Number.parseFloat(values[2]!) !== 1) {
          return null;
        }

        (node ??= new Matrix()).scaleSelf(scaleX, scaleY);
      }

      if (style.transform !== 'none') {
        const transform = new Matrix(style.transform);

        if (!transform.is2D) {
          return null;
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

        if (values.length > 2 && Number.parseFloat(values[2]!) !== 0) {
          return null;
        }
      }
    }

    if (node) {
      result.preMultiplySelf(node);
    }

    current = getFlatParent(current);

    if (current) {
      style = view.getComputedStyle(current);
    }
  }

  return result;
}

function createSpace(element: HTMLElement): Space | null {
  const { ownerDocument } = element;
  const view = ownerDocument.defaultView!;

  if (!element.isConnected) {
    return null;
  }

  const rects = element.getClientRects();

  if (rects.length !== 1) {
    return null;
  }

  const rect = rects[0]!;
  const style = view.getComputedStyle(element);
  const matrix = composeLinearMatrix(element, style, view);

  if (!matrix) {
    return null;
  }

  const absoluteA = Math.abs(matrix.a);
  const absoluteB = Math.abs(matrix.b);
  const absoluteC = Math.abs(matrix.c);
  const absoluteD = Math.abs(matrix.d);
  const determinant = absoluteA * absoluteD - absoluteB * absoluteC;
  const determinantScale = absoluteA * absoluteD + absoluteB * absoluteC;
  let width: number;
  let height: number;

  // Fall back before AABB inversion significantly amplifies input error.
  if (Math.abs(determinant) > determinantScale * 0.05) {
    width = (rect.width * absoluteD - rect.height * absoluteC) / determinant;
    height = (rect.height * absoluteA - rect.width * absoluteB) / determinant;
  } else {
    width = getBorderSize(style, 'width');
    height = getBorderSize(style, 'height');
  }

  matrix.e =
    rect.left - Math.min(0, matrix.a * width) - Math.min(0, matrix.c * height);
  matrix.f =
    rect.top - Math.min(0, matrix.b * width) - Math.min(0, matrix.d * height);

  if (
    !Number.isFinite(matrix.a) ||
    !Number.isFinite(matrix.b) ||
    !Number.isFinite(matrix.c) ||
    !Number.isFinite(matrix.d) ||
    !Number.isFinite(matrix.e) ||
    !Number.isFinite(matrix.f) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null;
  }

  return { ownerDocument, matrix, width, height };
}

function getSpace(
  element: HTMLElement,
  cache: InternalCache | undefined,
): Space | null {
  const cached = cache?.get(element);

  if (cached?.ownerDocument === element.ownerDocument) {
    return cached;
  }

  const space = createSpace(element);

  if (space) {
    cache?.set(element, space);
  }

  return space;
}

function getInverse(space: Space): DOMMatrix | null {
  if (space.inverse !== undefined) {
    return space.inverse;
  }

  const inverse = space.matrix.inverse();

  space.inverse =
    inverse.is2D &&
    Number.isFinite(inverse.a) &&
    Number.isFinite(inverse.b) &&
    Number.isFinite(inverse.c) &&
    Number.isFinite(inverse.d) &&
    Number.isFinite(inverse.e) &&
    Number.isFinite(inverse.f)
      ? inverse
      : null;
  return space.inverse;
}

export function readBoxQuad(
  element: HTMLElement,
  out: Quad,
  relativeTo?: HTMLElement,
  cache?: BoxQuadCache,
): boolean {
  const internalCache = cache as InternalCache | undefined;

  const document = element.ownerDocument;

  if (relativeTo && relativeTo.ownerDocument !== document) {
    return false;
  }

  const source = getSpace(element, internalCache);

  if (!source) {
    return false;
  }

  let { a, b, c, d, e, f } = source.matrix;

  if (relativeTo) {
    const target = getSpace(relativeTo, internalCache);

    if (!target) {
      return false;
    }

    const inverse = getInverse(target);

    if (!inverse) {
      return false;
    }

    const sourceA = a;
    const sourceB = b;
    const sourceC = c;
    const sourceD = d;
    const sourceE = e;
    const sourceF = f;
    a = inverse.a * sourceA + inverse.c * sourceB;
    b = inverse.b * sourceA + inverse.d * sourceB;
    c = inverse.a * sourceC + inverse.c * sourceD;
    d = inverse.b * sourceC + inverse.d * sourceD;
    e = inverse.a * sourceE + inverse.c * sourceF + inverse.e;
    f = inverse.b * sourceE + inverse.d * sourceF + inverse.f;
  }

  const x2 = a * source.width + e;
  const y2 = b * source.width + f;
  const x4 = c * source.height + e;
  const y4 = d * source.height + f;
  const x3 = x2 + x4 - e;
  const y3 = y2 + y4 - f;

  if (
    !Number.isFinite(e) ||
    !Number.isFinite(f) ||
    !Number.isFinite(x2) ||
    !Number.isFinite(y2) ||
    !Number.isFinite(x3) ||
    !Number.isFinite(y3) ||
    !Number.isFinite(x4) ||
    !Number.isFinite(y4)
  ) {
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
