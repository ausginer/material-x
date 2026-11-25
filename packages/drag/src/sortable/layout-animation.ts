/**
 * Displacement: the items a committed placeholder move pushed aside slide to their
 * new positions instead of jumping.
 *
 * A move that a resolution made is reported by the axis, which measured it. Around
 * any other placeholder move, a command's drop or a return, this feature measures the
 * rows itself. It owns the timing and the animations it starts. A rebuild never
 * cancels an animation, because that would leave a window in which a row has jumped.
 * `displaced` answers what an animation currently carries, from its timing, with no
 * layout read.
 *
 * Animations fold and do not stack. A second move arriving mid-flight cancels the
 * running animation and starts one from `residual + delta`, which lands the element
 * exactly where the running one had reached. So there is one animation per element,
 * and the sink can compute its current offset.
 *
 * No lifecycle waits for it: an animation in flight never delays release or teardown.
 * With `prefers-reduced-motion: reduce`, read at each report, the reported row starts
 * no animation and its running one ends.
 */
import { localDelta, type Delta, type Space } from '@ydinjs/box-quad';
import type {
  AxisContext,
  DisplacementInstaller,
  DisplacementSink,
} from './axis.ts';
import type { Insertion, ReorderRequest } from './domain.ts';
import { movePlaceholder, placeholderAt } from './placement.ts';

export type LayoutAnimationOptions = Readonly<{
  /**
   * The duration in milliseconds and the easing of a row's animation. Called when
   * the animation starts, and not with `prefers-reduced-motion: reduce`. Defaults
   * to 160 ms and `ease-out`.
   */
  timing?: () => Readonly<{ duration: number; easing: string }>;
}>;

type RowTiming = NonNullable<LayoutAnimationOptions['timing']>;

const DEFAULT_TIMING: RowTiming = () => ({ duration: 160, easing: 'ease-out' });

/** One element's animation, and the viewport vector it started with. */
type RowAnimation = Readonly<{
  animation: Animation;
  dx: number;
  dy: number;
}>;

/**
 * How much of an animation is still applied, as a fraction of its starting vector.
 * `progress` already has the easing applied, and the keyframes interpolate linearly
 * from the vector to zero. An overshooting easing takes this outside `[0, 1]`, which
 * is still exactly what the element carries, so it is not clamped.
 */
function remainingOf(animation: Animation): number {
  // Called once: each call returns a new timing dictionary.
  const { progress } = animation.effect!.getComputedTiming();

  return progress == null ? 0 : 1 - progress;
}

/** Whether `row` comes after `node` in document order. */
function follows(node: HTMLElement, row: HTMLElement): boolean {
  return (
    // oxlint-disable-next-line no-bitwise -- a documented bitfield
    (node.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  );
}

/** `finished` rejects when an animation is cancelled, and nothing waits for it. */
function ignoreRejection(): void {}

/**
 * One operation's displacement sink. Its animations are cancelled by `retire()`,
 * or outlive the operation when the controller is destroyed.
 */
class LayoutAnimationSink implements DisplacementSink {
  readonly #timing: RowTiming;
  readonly #running = new Map<HTMLElement, RowAnimation>();
  readonly #local: Delta = [];
  // What the last `displaced` call answered with, read through the getters.
  #carriedX = 0;
  #carriedY = 0;

  constructor(timing: RowTiming) {
    this.#timing = timing;
  }

  get dx(): number {
    return this.#carriedX;
  }

  get dy(): number {
    return this.#carriedY;
  }

  report(element: HTMLElement, dx: number, dy: number, space: Space): void {
    // Foreign code, so before the running animation ends: a throw leaves the row
    // where it is drawn.
    const timing = element.ownerDocument.defaultView!.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
      ? null
      : this.#timing();
    let sx = dx;
    let sy = dy;
    const previous = this.#running.get(element);

    if (previous) {
      const remaining = remainingOf(previous.animation);

      sx += previous.dx * remaining;
      sy += previous.dy * remaining;
      this.release(element);
    }

    if (!timing) {
      return;
    }

    // A singular ancestor renders nothing, so the vector's value is immaterial.
    if (!localDelta(space, sx, sy, this.#local)) {
      this.#local[0] = sx;
      this.#local[1] = sy;
    }

    // The individual `translate` property, added. `transform` would replace an
    // authored transform, and an additive `transform` would land inside the
    // element's own `scale()`. `translate` applies before `transform`, and only
    // this keyframe is in local units: what the sink stores stays in viewport
    // units, which is what a settled measurement assumes.
    const animation = element.animate(
      [
        { translate: `${this.#local[0]!}px ${this.#local[1]!}px` },
        { translate: '0 0' },
      ],
      {
        duration: timing.duration,
        easing: timing.easing,
        composite: 'add',
      },
    );
    const record: RowAnimation = { animation, dx: sx, dy: sy };

    // The identity test keeps a fold's cancellation from evicting the record
    // that replaced it. A cancel rejects `finished`, and each cancel has already
    // dropped its own record.
    animation.finished.then(() => {
      if (this.#running.get(element) === record) {
        this.#running.delete(element);
      }
    }, ignoreRejection);
    this.#running.set(element, record);
  }

  displaced(element: HTMLElement): boolean {
    const held = this.#running.get(element);

    if (!held) {
      return false;
    }

    const remaining = remainingOf(held.animation);

    this.#carriedX = held.dx * remaining;
    this.#carriedY = held.dy * remaining;
    return true;
  }

  relocate(
    rows: readonly HTMLElement[],
    isLinear: boolean,
    insertion: Insertion,
    { placeholder, space }: AxisContext,
    request: ReorderRequest | null,
  ): void {
    if (request) {
      const { item, previous, next } = request;
      const anchor = next ?? previous;
      const side = next ? 'previousElementSibling' : 'nextElementSibling';
      const beside = anchor?.[side];

      // The item between the placeholder and the gap's anchor moves no row: it has
      // no box there.
      if (
        anchor?.parentNode === placeholder.parentNode &&
        (beside === item ? item[side] : beside) !== placeholder
      ) {
        movePlaceholder(placeholder, {
          index: 0,
          before: previous,
          after: next,
        });
      }
    }

    if (placeholderAt(placeholder, insertion)) {
      return;
    }

    const { before, after } = insertion;
    // A crossed row is on one side of the placeholder now, and on the other side
    // of the gap. The gap is right before `after`, or right after `before`.
    const displaced = isLinear
      ? rows.filter(
          (row) =>
            follows(placeholder, row) !==
            (row === after || follows(after ?? before!, row)),
        )
      : rows;
    // What an animation draws is the same in both reads, which are in one task, so
    // the difference is the flow's alone.
    const from = displaced.map((row) => row.getBoundingClientRect());

    movePlaceholder(placeholder, insertion);

    // Every read before the first report, which writes.
    const to = displaced.map((row) => row.getBoundingClientRect());

    for (const [i, row] of displaced.entries()) {
      const dx = from[i]!.left - to[i]!.left;
      const dy = from[i]!.top - to[i]!.top;

      if (dx !== 0 || dy !== 0) {
        this.report(row, dx, dy, space);
      }
    }
  }

  release(element: HTMLElement): void {
    const held = this.#running.get(element);

    if (held) {
      this.#running.delete(element);
      held.animation.cancel();
    }
  }

  retire(): void {
    for (const { animation } of this.#running.values()) {
      animation.cancel();
    }

    this.#running.clear();
  }
}

/**
 * Written `displacement: layoutAnimation()`. Row animations outlive the operation
 * that started them, and the controller cancels what is running on destruction. With
 * `prefers-reduced-motion: reduce`, a row that moves starts none, and its running one
 * ends.
 */
export function layoutAnimation({
  timing = DEFAULT_TIMING,
}: LayoutAnimationOptions = {}): DisplacementInstaller {
  return () => new LayoutAnimationSink(timing);
}
