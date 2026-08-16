/**
 * Free drag's pure geometry: the constrained delta, the local-space projection,
 * and the two consumer-facing shapes derived from committed state.
 *
 * **Nothing here reads the DOM except `captureLocalSpace`, which runs once per
 * activation.** Every other function is arithmetic over numbers the frame
 * already holds, so the per-sample path performs no layout read and — apart
 * from the objects a consumer callback is handed — allocates nothing.
 */
import { box, coordinates } from '@ydinjs/box-quad';
import type { DOMRealm } from '../kernel/realm.ts';
import type { Point } from '../kernel/types.ts';
import type {
  DragAxis,
  DragGeometry,
  FreeDragRequest,
  FreeDragSubject,
} from './domain.ts';
import type { MotionDraft } from './feature.ts';

/**
 * The inherited linear part's indices in a box-quad measurement. Declared here
 * rather than imported because they are module-private to the kernel's own
 * presentation module — thirteen named offsets into a `Float64Array` are not a
 * vocabulary this package publishes, and four of them is a smaller duplication
 * than an SPI addition would be.
 */
const BOX_ANCESTOR_A = 9;
const BOX_ANCESTOR_B = 10;
const BOX_ANCESTOR_C = 11;
const BOX_ANCESTOR_D = 12;

/**
 * The inverse of the space a transform authored on the visual acts in, or
 * `null` for the identity — which is the common case, and which is what lets
 * `localDeltaOf` skip the arithmetic entirely.
 */
export type LocalSpace = Readonly<{
  a: number;
  b: number;
  c: number;
  d: number;
}> | null;

/**
 * **The whole of what replaced `coordinateSpace`** (D-72), read once at
 * activation.
 *
 * The shipped default mapper walked `offsetParent`, accumulating
 * `clientLeft`/`scrollLeft`/`zoom`/`offsetLeft` and each ancestor's transform.
 * That walk **is** a coordinate module, this package has none, and Phase 19
 * forbids adding one — so the question was never *is a mapper useful* but *what
 * can be derived without re-adding the module the package deleted*.
 *
 * box-quad answers it. It hands back the **inherited** linear part — everything
 * strictly above the element, with its own transform and zoom excluded — which
 * is exactly the space an authored translate acts in, and a **delta** maps
 * through the linear part alone. A *point* would additionally need the
 * translation, and box-quad exposes none: that is the seam, and D-72 follows it
 * rather than splitting the difference, which is why every point on this
 * surface is viewport.
 *
 * **The inherited space, not the visual's own.** Inverting the visual's own
 * would divide its scale out twice — a `scale(2)` visual would report half the
 * delta it travelled.
 *
 * Returns `null` when the space is the identity, unreadable, or singular. A
 * `null` means `localDelta === viewportDelta`, which is both the correct answer
 * for an untransformed ancestry and the honest one for a space that cannot be
 * inverted.
 */
export function captureLocalSpace(visual: HTMLElement): LocalSpace {
  const measured = box();

  if (!coordinates(visual, measured)) {
    return null;
  }

  const a = measured[BOX_ANCESTOR_A]!;
  const b = measured[BOX_ANCESTOR_B]!;
  const c = measured[BOX_ANCESTOR_C]!;
  const d = measured[BOX_ANCESTOR_D]!;

  if (a === 1 && b === 0 && c === 0 && d === 1) {
    return null;
  }

  const determinant = a * d - b * c;

  if (determinant === 0 || !Number.isFinite(determinant)) {
    return null;
  }

  return {
    a: d / determinant,
    b: -b / determinant,
    c: -c / determinant,
    d: a / determinant,
  };
}

/** Four multiplies, or the delta itself when the ancestry is untransformed. */
export function localDeltaOf(space: LocalSpace, x: number, y: number): Point {
  return space === null
    ? { x, y }
    : { x: space.a * x + space.c * y, y: space.b * x + space.d * y };
}

/**
 * **Axis projection, in place** (D-70): two comparisons and no state, which is
 * why `axis` is a plain config key and not a capability. A factory for it would
 * ship a module, an entry and a closure to save exactly this.
 */
export function applyAxis(motion: MotionDraft, axis: DragAxis): void {
  if (axis === 'x') {
    motion.y = 0;
  } else if (axis === 'y') {
    motion.x = 0;
  }
}

/**
 * The visual's current rect, derived arithmetically — **no layout read**. The
 * constructor comes from the owning realm rather than the ambient global, so a
 * controller created inside an iframe hands its consumer a rect belonging to
 * that document.
 */
export function currentRect(
  originRect: DOMRectReadOnly,
  dx: number,
  dy: number,
  realm: DOMRealm,
): DOMRectReadOnly {
  return new realm.window.DOMRectReadOnly(
    originRect.x + dx,
    originRect.y + dy,
    originRect.width,
    originRect.height,
  );
}

/**
 * What `onStart` and `onMove` are handed. `dx`/`dy` are the **rendered** delta —
 * axis-projected and clamped — not the raw pointer travel, which is what makes
 * `currentRect` the visual's real box under a lock or a clamp.
 */
export function buildGeometry(
  pointerX: number,
  pointerY: number,
  originX: number,
  originY: number,
  dx: number,
  dy: number,
  originRect: DOMRectReadOnly,
  space: LocalSpace,
  realm: DOMRealm,
): DragGeometry {
  return {
    pointer: { x: pointerX, y: pointerY },
    originPointer: { x: originX, y: originY },
    viewportDelta: { x: dx, y: dy },
    localDelta: localDeltaOf(space, dx, dy),
    originRect,
    currentRect: currentRect(originRect, dx, dy, realm),
  };
}

/** The release snapshot `onDrop` is asked about. Pure, for the same reason. */
export function buildRequest(
  subject: FreeDragSubject,
  pointerX: number,
  pointerY: number,
  dx: number,
  dy: number,
  originRect: DOMRectReadOnly,
  space: LocalSpace,
  realm: DOMRealm,
): FreeDragRequest {
  const visualRect = currentRect(originRect, dx, dy, realm);

  return {
    item: subject.item,
    visual: subject.visual,
    pointer: { x: pointerX, y: pointerY },
    viewportPosition: { x: visualRect.left, y: visualRect.top },
    viewportDelta: { x: dx, y: dy },
    localDelta: localDeltaOf(space, dx, dy),
    visualRect,
  };
}
