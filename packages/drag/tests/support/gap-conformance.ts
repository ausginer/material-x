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
 * How far a candidate's distance to the pointer may exceed the smallest and still
 * give an admissible gap. `y()` predicts each center it compares to within 1/16 px
 * of a measurement, and each of the two centers compared may be off by that much,
 * so where the pointer is within 1/8 px of equidistant from two of them, either
 * gap is a correct placement.
 */
const TIE_TOLERANCE = 1 / 8;

/**
 * `y()`'s rule over every row, measured now: the gaps given by every candidate
 * whose center is within `TIE_TOLERANCE` of the nearest to `pointerY`. The
 * candidates are the placeholder's own center, which keeps the gap it occupies,
 * and each row's, whose gap is on the side of that row the placeholder travels
 * toward. Without a tie it is the rule's one gap.
 */
export function admissibleGaps(
  rows: readonly HTMLElement[],
  placeholder: Element,
  pointerY: number,
  measured: MeasuredElement = measureRow,
): number[] {
  const anchor = centerOf(placeholder).y;
  const distances = [Math.abs(pointerY - anchor)];
  const gaps = [proposedGap(rows, placeholder)];

  for (const [i, row] of rows.entries()) {
    const center = settledCenterY(row, measured);

    distances.push(Math.abs(pointerY - center));
    gaps.push(center > anchor ? i + 1 : i);
  }

  const nearest = Math.min(...distances);
  const admissible = new Set<number>();

  for (const [i, distance] of distances.entries()) {
    if (distance - nearest <= TIE_TOLERANCE) {
      admissible.add(gaps[i]!);
    }
  }

  return [...admissible];
}

export type Sweep = Readonly<{
  /** The rows other than the dragged one, in collection order. */
  rows: readonly HTMLElement[];
  placeholder: () => Element | null;
  pointerX: number;
  /** The pointer's y at each step, in viewport coordinates. */
  path: readonly number[];
  measured?: MeasuredElement;
  /** Called at each sample where more than one gap is admissible. */
  onTie?: (pointerY: number) => void;
}>;

/**
 * Moves the held pointer along the path and returns each sample where `y()`'s
 * proposal is not a gap that a full measurement admits. The frame after a move
 * resolves against the geometry measured before it, while nothing changes the
 * tree. A drag that ended, for a fault or otherwise, is a disagreement too.
 */
export async function sweepGaps({
  rows,
  placeholder,
  pointerX,
  path,
  measured = measureRow,
  onTie,
}: Sweep): Promise<string[]> {
  const disagreements: string[] = [];

  for (const pointerY of path) {
    const expected = admissibleGaps(rows, placeholder()!, pointerY, measured);

    if (expected.length > 1) {
      onTie?.(pointerY);
    }

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

    if (!expected.includes(proposed)) {
      disagreements.push(
        `at ${pointerY}: proposed ${proposed}, measured ${expected.join(' or ')}`,
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
