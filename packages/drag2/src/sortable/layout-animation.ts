/**
 * Displacement: the items a committed placeholder move pushed aside slide to
 * their new positions instead of jumping.
 *
 * ```text
 * beforeMove   measure the affected span
 * placeholder  the sole writer of placeholder position
 * afterMove    re-measure, invert, play
 * ```
 *
 * **It is not a lifecycle gate, and structurally cannot become one** (D-7): it
 * has no access to `SettlementScope`, which is passed only to
 * `settlement.effect`. An in-flight displacement never delays release,
 * settlement or presentation teardown, and a completion carries no operation
 * identity because it can affect nothing outside this feature's own element map.
 *
 * **The affected set is the span between the two gaps, not the destination
 * view** — M-4's answer, measured in `.agents/docs/drag/measurements/q7.md`:
 * 0.16ms against 2.3ms per committed move at 800 rows, and the items outside the
 * span do not move at all, so a full-list pass animates zero deltas for them.
 */
import { brandFeature, type SortableFeature } from './feature.ts';
import type { DisplacementView } from './slots.ts';

export type LayoutAnimationOptions = Readonly<{
  duration?: number;
  easing?: string;
}>;

const DEFAULT_DURATION = 160;
const DEFAULT_EASING = 'ease-out';

export function layoutAnimation(
  options: LayoutAnimationOptions = {},
): SortableFeature {
  const duration = options.duration ?? DEFAULT_DURATION;
  const easing = options.easing ?? DEFAULT_EASING;

  return brandFeature(() => {
    // Private runtime: the animation this feature is currently running per
    // element, and the span of the move being bracketed. Nobody else can name
    // it, and `retire` is the only way anything leaves it.
    const running = new Map<HTMLElement, Animation>();
    // Reused across moves rather than reallocated: the bracket is the only
    // reader, and it is strictly `beforeMove` → write → `afterMove`.
    const affected: HTMLElement[] = [];
    const tops: number[] = [];

    /**
     * The elements between the placeholder's current position and the gap it is
     * moving to, walked as siblings — O(distance), and **no layout read**. The
     * direction is one `compareDocumentPosition`; everything after that is
     * pointer chasing.
     */
    const collect = (view: DisplacementView): void => {
      affected.length = 0;

      const { placeholder, insertion } = view;
      // The element the placeholder will sit next to when the move lands.
      const anchor = insertion.after ?? insertion.before;

      if (anchor === null || anchor === placeholder) {
        return;
      }

      const forward =
        // oxlint-disable-next-line no-bitwise
        (placeholder.compareDocumentPosition(anchor) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
        0;
      let cursor = forward
        ? placeholder.nextElementSibling
        : placeholder.previousElementSibling;

      while (cursor !== null) {
        affected.push(cursor as HTMLElement);

        if (cursor === anchor) {
          return;
        }

        cursor = forward
          ? cursor.nextElementSibling
          : cursor.previousElementSibling;
      }

      // The anchor is not a sibling of the placeholder — a consumer commit can
      // reparent items mid-drag. Nothing here is measured against a tree this
      // feature cannot reason about.
      affected.length = 0;
    };

    return {
      beforeInsertionMove(view): void {
        collect(view);
        tops.length = 0;

        for (const element of affected) {
          // Deliberately measured **with** any running animation still applied:
          // the rect already includes its current transform, which is what makes
          // retargeting fall out for free. A displacement interrupted halfway
          // replays from where the element visually is, not from where it was
          // authored.
          tops.push(element.getBoundingClientRect().top);
        }
      },

      afterInsertionMove(): void {
        for (let i = 0; i < affected.length; i += 1) {
          const element = affected[i]!;
          const previous = running.get(element);

          // Cancelled *before* the second measurement, so the new rect is the
          // element's true layout position. Measuring it while the old
          // animation still applied would subtract the transform from both
          // sides and lose the offset entirely.
          if (previous !== undefined) {
            previous.cancel();
            running.delete(element);
          }

          const delta = tops[i]! - element.getBoundingClientRect().top;

          if (delta === 0) {
            continue;
          }

          const animation = element.animate(
            [
              { transform: `translateY(${delta}px)` },
              { transform: 'translateY(0)' },
            ],
            { duration, easing },
          );

          running.set(element, animation);
          // The library performs only the measurements and temporary transform
          // writes that make animation possible; it holds nothing afterwards.
          animation.finished.then(
            () => {
              if (running.get(element) === animation) {
                running.delete(element);
              }
            },
            () => {
              // A cancel — from a retarget or from `retire` — rejects
              // `finished`. Both paths have already removed the entry.
            },
          );
        }
      },

      retire(): void {
        // Every touched element restored exactly once: the map is the record of
        // what this feature wrote, and emptying it is what makes a late
        // completion find nothing to write.
        for (const animation of running.values()) {
          animation.cancel();
        }

        running.clear();
        affected.length = 0;
        tops.length = 0;
      },
    };
  });
}
