/**
 * A `freeDrag` box at a known position, and the pointer events that the
 * Playwright mouse cannot produce: a `pointerup` away from the last
 * `pointermove`, and a `pointercancel`.
 */
import {
  freeDrag,
  FreeDragResolution,
  type FreeDragConfig,
  type FreeDragController,
} from '../../src/free-drag.ts';
import { log, onCleanup } from './harness.ts';

/** The box's top-left in the viewport. */
export const BOX_LEFT = 40;
export const BOX_TOP = 40;

export type MountedBox = Readonly<{
  box: HTMLElement;
  controller: FreeDragController;
}>;

/**
 * A 50×50 box at (`BOX_LEFT`, `BOX_TOP`) under `freeDrag`, which accepts every
 * drop and logs `start` and `end:<type>`. Destroyed after the test.
 */
export function mountBox(config: Partial<FreeDragConfig> = {}): MountedBox {
  const box = document.createElement('div');

  box.id = 'free';
  box.style.cssText = `position:absolute;left:${BOX_LEFT}px;top:${BOX_TOP}px;width:50px;height:50px;touch-action:none;user-select:none`;
  document.body.append(box);

  const controller = freeDrag(box, {
    onDrop: () => FreeDragResolution.accept(),
    onStart() {
      log.push('start');
    },
    onEnd(result) {
      log.push(`end:${result.type}`);
    },
    ...config,
  });

  onCleanup(() => controller.requestDestroy());
  return { box, controller };
}

let pressedPointerId = 0;

addEventListener(
  'pointerdown',
  (event) => {
    pressedPointerId = event.pointerId;
  },
  { capture: true },
);

/**
 * Dispatches `type` for the pointer of the last press, at a viewport point. The
 * real button stays held.
 */
export function dispatchPointer(
  type: 'pointercancel' | 'pointerup',
  x: number,
  y: number,
): void {
  document.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: pressedPointerId,
      isPrimary: true,
      clientX: x,
      clientY: y,
    }),
  );
}
