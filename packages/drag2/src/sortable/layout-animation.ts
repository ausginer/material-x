/**
 * Displacement: the items a committed placeholder move pushed aside slide to
 * their new positions instead of jumping.
 *
 * ```text
 * beforeMove   measure the affected set where it currently looks,
 *              then RELEASE every offset this feature owns
 * placeholder  the sole writer of placeholder position
 * (behavior)   the axis rebuilds its index — settled presentation geometry
 * afterMove    re-measure, invert, play
 * ```
 *
 * **It is not a lifecycle gate, and structurally cannot become one** (D-7): it
 * has no access to `SettlementScope`, which is passed only to
 * `settlement.effect`. An in-flight displacement never delays release,
 * settlement or presentation teardown, and a completion carries no operation
 * identity because it can affect nothing outside this feature's own element map.
 *
 * **The affected set is the crossed span, not the destination view** — M-4's
 * answer, measured in `.plan/measurements/q7.md`: 0.16ms against
 * 2.3ms per committed move at 800 rows, and the items outside the span do not
 * move at all, so a full-list pass animates zero deltas for them.
 */
import type { SortableConfig } from './config.ts';
import type { SortableInstaller } from './feature.ts';
import { requireFinite, type DisplacementView } from './slots.ts';

export type LayoutAnimationOptions = Readonly<{
  duration?: number;
  easing?: string;
}>;

const DEFAULT_DURATION = 160;
const DEFAULT_EASING = 'ease-out';

export function layoutAnimation(
  options: LayoutAnimationOptions = {},
): Pick<SortableConfig, 'plugins'> {
  const duration = requireFinite(
    options.duration ?? DEFAULT_DURATION,
    'layoutAnimation({ duration })',
    0,
  );
  const easing = options.easing ?? DEFAULT_EASING;

  const install: SortableInstaller = () => {
    // Private runtime: the animation this feature is currently running per
    // element, the set of elements it may touch, and the bracketed move's
    // measurements. Nobody else can name it, and `retire` is the only way
    // anything leaves it.
    const running = new Map<HTMLElement, Animation>();
    // Snapshot membership, rebuilt only when the collection version moves. A
    // linear `includes` per candidate would make the walk O(distance × list);
    // this makes it O(list) per *collection change* and O(1) per candidate, on
    // the key the behavior already stamps every snapshot with.
    const members = new Set<HTMLElement>();
    let membersVersion = -1;
    // Reused across moves rather than reallocated: the bracket is the only
    // reader, and it is strictly `beforeMove` → write → `afterMove`.
    const affected: HTMLElement[] = [];
    const tops: number[] = [];

    /**
     * The set this move may animate: **the crossed span, plus every element
     * still carrying an offset from an earlier move.**
     *
     * The span alone is not enough. During a fast drag an element from the
     * previous move is still mid-flight, and its offset is visible to any
     * geometry read — including the axis rebuild this bracket exists to
     * protect. Including it means it is released and replayed rather than left
     * lying, which is the same retargeting idiom the span already uses.
     *
     * Ownership is explicit at every step: an element is animated only if the
     * collection contains it, and never if it is the dragged item (whose
     * presentation the kernel's lift owns) or the placeholder (whose position
     * the behavior owns). The dragged item is not a hypothetical — the
     * placeholder is inserted immediately after it, so it is the *first*
     * sibling a backward span walks over.
     */
    const collect = (view: DisplacementView): void => {
      const { placeholder, insertion, snapshot, item } = view;

      if (membersVersion !== snapshot.version) {
        members.clear();

        for (const member of snapshot.items) {
          members.add(member);
        }

        membersVersion = snapshot.version;
      }

      affected.length = 0;

      // The element the placeholder will sit next to when the move lands.
      const anchor = insertion.after ?? insertion.before;

      if (anchor !== null && anchor !== placeholder) {
        const forward =
          // oxlint-disable-next-line no-bitwise
          (placeholder.compareDocumentPosition(anchor) &
            Node.DOCUMENT_POSITION_FOLLOWING) !==
          0;
        let cursor = forward
          ? placeholder.nextElementSibling
          : placeholder.previousElementSibling;
        let reached = false;

        // O(distance), and **no layout read**. The direction is one
        // `compareDocumentPosition`; everything after that is pointer chasing.
        while (cursor !== null) {
          const element = cursor as HTMLElement;

          if (element !== item && members.has(element)) {
            affected.push(element);
          }

          if (cursor === anchor) {
            reached = true;
            break;
          }

          cursor = forward
            ? cursor.nextElementSibling
            : cursor.previousElementSibling;
        }

        if (!reached) {
          // The anchor is not a sibling of the placeholder — a consumer commit
          // can reparent items mid-drag. Nothing here is measured against a
          // tree this feature cannot reason about. Only the span is dropped;
          // the in-flight set below still has to be released either way.
          affected.length = 0;
        }
      }

      for (const element of running.keys()) {
        if (!members.has(element) || element === item) {
          // Left the collection mid-drag. It is still released below with
          // everything else; it simply earns no new displacement.
          continue;
        }

        if (!affected.includes(element)) {
          affected.push(element);
        }
      }
    };

    /**
     * The bracket's own retired state (I-36). `retire()` has already emptied
     * these two arrays by the time a barrier fires — it runs inside the
     * reentrant `destroy()` — so this is a restore, not a clear: it undoes
     * whatever the aborted pass wrote back into them and stops a destroyed
     * controller pinning the rows it was mid-measurement on (I-20).
     */
    const discard = (): void => {
      affected.length = 0;
      tops.length = 0;
    };

    return {
      beforeInsertionMove(view): void {
        collect(view);
        tops.length = 0;

        for (const element of affected) {
          // **The measurement barrier** (I-36, indirect-invocation clause).
          // The rows are consumer-owned, so the previous iteration's
          // `getBoundingClientRect()` — and `collect`'s own sibling walk — is
          // consumer code that may have destroyed the controller. Read at the
          // head so one reading covers the entry and every predecessor.
          if (!view.live()) {
            discard();
            return;
          }

          // Deliberately measured **with** this feature's offsets still
          // applied: the rect already includes the current displacement, which
          // is what makes retargeting fall out for free. A displacement
          // interrupted halfway replays from where the element visually is,
          // not from where it was authored.
          tops.push(element.getBoundingClientRect().top);
        }

        if (!view.live()) {
          // The last row's own measurement. Without this the partial `tops`
          // survives on a retired feature, and `movePlaceholder` — the
          // behavior's next statement — is a DOM write on a destroyed
          // controller; the behavior takes its own reading for that one.
          discard();
          return;
        }

        // Released here, not lazily per element in `afterMove`, and *all* of
        // them rather than just this span's. Everything downstream of this line
        // — the axis rebuild, and this feature's own second measurement — has
        // to see settled presentation geometry, and one element still carrying
        // an offset is enough to corrupt both. No frame is painted inside the
        // effect, so nothing snaps visibly: every released element is replayed
        // from the position just recorded above.
        for (const animation of running.values()) {
          animation.cancel();
        }

        running.clear();
      },

      afterInsertionMove(view): void {
        for (let i = 0; i < affected.length; i += 1) {
          // **The measurement barrier** (I-36). Covers the entry — the
          // behavior's eager axis rebuild ran between the two passes — and the
          // previous iteration's `getBoundingClientRect()` and `animate()`,
          // both consumer calls on a consumer-owned row.
          if (!view.live()) {
            discard();
            return;
          }

          const element = affected[i]!;
          const delta = tops[i]! - element.getBoundingClientRect().top;

          if (delta === 0) {
            continue;
          }

          // **The barrier the reviewer reproduced** (C4-01): the measurement
          // one line above destroyed the controller and `animate()` still ran,
          // starting a WAAPI animation on a retired feature that `retire()` had
          // already finished cancelling — so nothing would ever release it.
          if (!view.live()) {
            discard();
            return;
          }

          // The individual `translate` property, added rather than assigned.
          //
          // `transform` would be wrong twice over: it *replaces* an authored
          // `rotate(4deg)` for the duration, and it overrides a consumer's own
          // running transform animation. Additive `transform` is wrong too —
          // additive transform lists concatenate, so the offset would land
          // inside the element's own `scale()` and move it by a multiple of the
          // delta, while the delta was measured in viewport space.
          //
          // `translate` applies *before* `transform` in the used-value chain
          // (`translate → rotate → scale → transform`), so the offset is
          // outside the element's own transform and needs no correction; and
          // `composite: 'add'` composes it with an authored `translate` or a
          // consumer animation on the same property instead of clobbering it.
          const animation = element.animate(
            [{ translate: `0 ${delta}px` }, { translate: '0 0' }],
            { duration, easing, composite: 'add' },
          );

          if (!view.live()) {
            // `animate()` is itself overridable on a consumer's row, so it is
            // the third consumer call in this iteration. Cancelled rather than
            // abandoned: it is not in `running` yet, so `retire()` cannot have
            // seen it and nothing else would ever stop it.
            animation.cancel();
            discard();
            return;
          }

          try {
            // The library performs only the measurements and temporary offsets
            // that make animation possible; it holds nothing afterwards.
            animation.finished.then(
              () => {
                if (running.get(element) === animation) {
                  running.delete(element);
                }
              },
              () => {
                // A cancel — from the release above, or from `retire` — rejects
                // `finished`. Both paths have already removed the entry.
              },
            );
          } catch (error) {
            // Acquisition is all-or-nothing, for the same reason it is in
            // `landing()`: `finished` is an accessor and `then` is a call. An
            // animation that is started but never tracked would survive
            // `retire()` and keep offsetting an element nothing owns.
            animation.cancel();
            throw error;
          }

          if (!view.live()) {
            // **Subscription is part of the acquisition** (C5-01). `finished`
            // is an overridable accessor and `then` an overridable call, so a
            // consumer-instrumented animation can destroy the controller and
            // return normally — no throw, so the `catch` above never sees it.
            // `retire()` then ran while `running` was still empty, and
            // publishing below would retain the row and leave a live
            // displacement on it forever.
            animation.cancel();
            discard();
            return;
          }

          // Published only once it is tracked, and only ever one per element:
          // the map was emptied in `beforeMove`, so nothing can stack here.
          running.set(element, animation);
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
        // Retention, not behaviour: the set is what pins collection DOM between
        // operations, exactly like `y()`'s element array.
        members.clear();
        membersVersion = -1;
        discard();
      },
    };
  };

  return { plugins: [install] };
}
