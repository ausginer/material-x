import { server, userEvent } from 'vitest/browser';
import { capture, nextFrame, settleAnimations } from './browser.ts';

/**
 * The key that moves focus to every control. Safari's default Tab skips
 * buttons and links, and Option-Tab reaches them.
 */
export const TAB: string =
  server.browser === 'safari' ? '{Alt>}{Tab}{/Alt}' : '{Tab}';

/** Moves keyboard focus to the first tab stop of `fixture`. */
export async function focusFirst(fixture: HTMLElement): Promise<void> {
  const before = document.createElement('button');
  fixture.before(before);
  before.focus();
  await userEvent.keyboard(TAB);
  before.remove();
  await nextFrame();
}

/** An edge of a box, as a physical side, and the box that has it. */
export type Edge = Readonly<{
  box: Element;
  side: 'left' | 'right' | 'bottom';
}>;

/** The reach of a focus indicator on either side of its box's edge. */
const REACH = 6;

/** How far apart two channels may be and still be the same color. */
const TOLERANCE = 12;

function channels(color: string): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d')!;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  return context.getImageData(0, 0, 1, 1).data;
}

/**
 * Counts the pixels that the outline of `edge.box` paints along `edge` with
 * `siblings` hidden, and those of them that it doesn't paint with `siblings`
 * shown. `frame` holds them all.
 */
export async function coveredIndicator(
  frame: HTMLElement,
  { box, side }: Edge,
  siblings: readonly HTMLElement[],
): Promise<Readonly<{ painted: number; covered: number }>> {
  const root = box.getRootNode();

  // Focus changes a control's shape over a transition.
  if (root instanceof ShadowRoot) {
    await settleAnimations(root.host as HTMLElement);
  }

  const color = channels(getComputedStyle(box).outlineColor);
  const origin = frame.getBoundingClientRect();
  const rect = box.getBoundingClientRect();
  const shown = await capture(frame);

  for (const sibling of siblings) {
    sibling.style.visibility = 'hidden';
  }

  const alone = await capture(frame);

  for (const sibling of siblings) {
    sibling.style.removeProperty('visibility');
  }

  const scale = alone.width / origin.width;
  const isHorizontal = side !== 'bottom';
  const at = rect[side] - (isHorizontal ? origin.left : origin.top);
  const isPainted = ({ data }: ImageData, index: number) =>
    [0, 1, 2].every(
      (channel) =>
        Math.abs(data[index + channel]! - color[channel]!) < TOLERANCE,
    );
  let painted = 0;
  let covered = 0;

  for (let index = 0; index < alone.data.length; index += 4) {
    const pixel = index / 4;
    const x = (pixel % alone.width) / scale;
    const y = Math.floor(pixel / alone.width) / scale;

    if (
      Math.abs((isHorizontal ? x : y) - at) <= REACH &&
      isPainted(alone, index)
    ) {
      painted += 1;
      covered += isPainted(shown, index) ? 0 : 1;
    }
  }

  return { painted, covered };
}
