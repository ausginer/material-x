/**
 * Free drag's pure geometry: the constrained delta, the local-space projection,
 * and the two consumer-facing shapes derived from committed state.
 *
 * Nothing here reads the DOM, and a read here would be wrong. It would be a
 * second box-quad traversal per activation. That is not only duplicate work: it
 * runs after `acquireLift` has changed positioning, dimensions, top-layer state
 * and transforms, so a lifted visual would report the viewport's ancestry and
 * not the ancestry the operation began in. The kernel passes the projection on
 * `ActivationScope`, and every function here is arithmetic over numbers the
 * frame already holds. The per-sample path performs no layout read and, apart
 * from the two rects a consumer callback receives, allocates nothing. The
 * coordinates on both consumer shapes are scalars for that reason.
 *
 * The local-space projection is written out at each of its two sites and is not
 * moved into a per-axis helper. It is two multiplies and an add, the two call
 * sites are the only ones there will be, and a per-axis helper reads the same
 * `space` twice through a call the inliner must see through.
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
 * Axis projection, in place: two comparisons and no state, so `axis` is a plain
 * config key and not a capability. A factory for it would ship a module, an
 * entry and a closure to save only this.
 */
export function applyAxis(motion: MotionDraft, axis: DragAxis): void {
  if (axis === 'x') {
    motion.y = 0;
  } else if (axis === 'y') {
    motion.x = 0;
  }
}

/**
 * The visual's current rect, derived arithmetically with no layout read. The
 * constructor comes from the owning realm and not the ambient global, so a
 * controller created inside an iframe gives its consumer a rect belonging to
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
 * What `onStart` and `onMove` receive. `dx`/`dy` are the rendered delta,
 * axis-projected and clamped, not the raw pointer travel. So `currentRect` is
 * the visual's real box under a lock or a clamp.
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
  let localDeltaX = dx;
  let localDeltaY = dy;

  if (space) {
    localDeltaX = space.a * dx + space.c * dy;
    localDeltaY = space.b * dx + space.d * dy;
  }

  return {
    pointerX,
    pointerY,
    originPointerX: originX,
    originPointerY: originY,
    viewportDeltaX: dx,
    viewportDeltaY: dy,
    localDeltaX,
    localDeltaY,
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

  let localDeltaX = dx;
  let localDeltaY = dy;

  if (space) {
    localDeltaX = space.a * dx + space.c * dy;
    localDeltaY = space.b * dx + space.d * dy;
  }

  return {
    item: subject.item,
    visual: subject.visual,
    pointerX,
    pointerY,
    positionX: visualRect.left,
    positionY: visualRect.top,
    viewportDeltaX: dx,
    viewportDeltaY: dy,
    localDeltaX,
    localDeltaY,
    visualRect,
  };
}
