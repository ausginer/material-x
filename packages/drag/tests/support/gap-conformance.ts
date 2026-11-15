/**
 * An instrument for `drag:DRI-14` Geometry: it compares the gap `y()` proposes with
 * the gap its rule gives over a full measurement of every row, taken at the same
 * instant. It holds the rule and nothing of `y()`'s cache, window or prediction.
 */
import { commands } from 'vitest/browser';
import { centerOf, frames } from './harness.ts';

/** The element a row is measured through: `box`, or `visual` when there's no `box`. */
export type MeasuredElement = (row: HTMLElement) => HTMLElement;

const measureRow: MeasuredElement = (row) => row;

/**
 * Where flow puts a row's center on y: its rect, less the `translate` that a
 * running `layoutAnimation` adds to the row. A fixture that uses this authors no
 * `translate` of its own, and no ancestor transform.
 */
function settledCenterY(row: HTMLElement, measured: MeasuredElement): number {
  const [, translateY = '0'] = getComputedStyle(row).translate.split(' ');

  return centerOf(measured(row)).y - Number.parseFloat(translateY);
}

/**
 * The gap the placeholder occupies: the number of rows before it. The rows are its
 * siblings.
 */
export function proposedGap(
  rows: readonly HTMLElement[],
  placeholder: Element,
): number {
  const members = new Set<Element>(rows);
  let gap = 0;

  for (
    let sibling = placeholder.previousElementSibling;
    sibling;
    sibling = sibling.previousElementSibling
  ) {
    if (members.has(sibling)) {
      gap += 1;
    }
  }

  return gap;
}

/**
 * `y()`'s rule over every row, measured now: the row center nearest `pointerY`,
 * the first in order among equals, with the placeholder's own center as the
 * incumbent. The gap is on the side of that row the placeholder travels toward.
 */
export function measuredGap(
  rows: readonly HTMLElement[],
  placeholder: Element,
  pointerY: number,
  measured: MeasuredElement = measureRow,
): number {
  const anchor = centerOf(placeholder).y;
  let best = Math.abs(pointerY - anchor);
  let nearest = -1;
  let nearestCenter = 0;

  for (const [i, row] of rows.entries()) {
    const center = settledCenterY(row, measured);
    const distance = Math.abs(pointerY - center);

    if (distance < best) {
      best = distance;
      nearest = i;
      nearestCenter = center;
    }
  }

  if (nearest === -1) {
    return proposedGap(rows, placeholder);
  }

  return nearestCenter > anchor ? nearest + 1 : nearest;
}

export type Sweep = Readonly<{
  /** The rows other than the dragged one, in collection order. */
  rows: readonly HTMLElement[];
  placeholder: () => Element | null;
  pointerX: number;
  /** The pointer's y at each step, in viewport coordinates. */
  path: readonly number[];
  measured?: MeasuredElement;
}>;

/**
 * Moves the held pointer along the path and returns each disagreement between
 * `y()`'s proposal and a full measurement. The frame after a move resolves against
 * the geometry measured before it, while nothing changes the tree. A drag that
 * ended, for a fault or otherwise, is a disagreement too.
 */
export async function sweepGaps({
  rows,
  placeholder,
  pointerX,
  path,
  measured = measureRow,
}: Sweep): Promise<string[]> {
  const disagreements: string[] = [];

  for (const pointerY of path) {
    const expected = measuredGap(rows, placeholder()!, pointerY, measured);

    // oxlint-disable-next-line no-await-in-loop -- one sample per step
    await commands.pointerMove(pointerX, pointerY);
    // oxlint-disable-next-line no-await-in-loop -- the frames resolve the sample
    await frames();

    const current = placeholder();

    if (!current) {
      disagreements.push(`at ${pointerY}: no placeholder`);
      break;
    }

    const proposed = proposedGap(rows, current);

    if (proposed !== expected) {
      disagreements.push(
        `at ${pointerY}: proposed ${proposed}, measured ${expected}`,
      );
    }
  }

  return disagreements;
}

/** Steps of `step` from `from` to `to` and back, both ends included. */
export function roundTrip(from: number, to: number, step: number): number[] {
  const path: number[] = [];

  for (let at = from; at <= to; at += step) {
    path.push(at);
  }

  for (let at = to; at >= from; at -= step) {
    path.push(at);
  }

  return path;
}
