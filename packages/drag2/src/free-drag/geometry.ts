/**
 * Free drag's pure geometry: the constrained delta, the local-space projection,
 * and the two consumer-facing shapes derived from committed state.
 *
 * **Nothing here reads the DOM at all** (D-85), and a reader here is wrong: it
 * would be a second box-quad traversal per activation, and E-01 established
 * that such a second read is not merely duplicate work — it runs *after*
 * `acquireLift` has changed positioning, dimensions, top-layer state and
 * transforms, so a lifted visual would report the viewport's ancestry rather
 * than the one the operation began in. The kernel hands the projection down on
 * `ActivationScope`, and every function here is arithmetic
 * over numbers the frame already holds: the per-sample path performs no layout
 * read and — apart from the two rects a consumer callback is handed —
 * allocates nothing. The coordinates on both consumer shapes are scalars for
 * exactly that reason (D-139).
 */
import type { InheritedSpace } from '../kernel/presentation.ts';
import type { DOMRealm } from '../kernel/realm.ts';
import type {
  DragAxis,
  DragGeometry,
  FreeDragRequest,
  FreeDragSubject,
} from './domain.ts';
import type { MotionDraft } from './feature.ts';

/**
 * Two multiplies each, or the delta itself when the ancestry is untransformed.
 *
 * **A function per axis rather than one returning a point** (D-139): the two
 * consumer shapes carry the local delta as scalars, so a point here would be
 * allocated once per sample only to be read twice and dropped.
 */
export function localDeltaX(
  space: InheritedSpace,
  x: number,
  y: number,
): number {
  return space ? space.a * x + space.c * y : x;
}

export function localDeltaY(
  space: InheritedSpace,
  x: number,
  y: number,
): number {
  return space ? space.b * x + space.d * y : y;
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
  space: InheritedSpace,
  realm: DOMRealm,
): DragGeometry {
  return {
    pointerX,
    pointerY,
    originPointerX: originX,
    originPointerY: originY,
    viewportDeltaX: dx,
    viewportDeltaY: dy,
    localDeltaX: localDeltaX(space, dx, dy),
    localDeltaY: localDeltaY(space, dx, dy),
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
  space: InheritedSpace,
  realm: DOMRealm,
): FreeDragRequest {
  const visualRect = currentRect(originRect, dx, dy, realm);

  return {
    item: subject.item,
    visual: subject.visual,
    pointerX,
    pointerY,
    positionX: visualRect.left,
    positionY: visualRect.top,
    viewportDeltaX: dx,
    viewportDeltaY: dy,
    localDeltaX: localDeltaX(space, dx, dy),
    localDeltaY: localDeltaY(space, dx, dy),
    visualRect,
  };
}
