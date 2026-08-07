/**
 * The consumer-facing controller. Four members, two of which are the kernel's
 * own — the behavior adds the two things the kernel cannot know about: what a
 * collection is, and what a request is.
 */
import { DEV } from '../kernel/dev.ts';
import { report } from '../kernel/reporter.ts';
import type { KernelHost } from '../kernel/spec.ts';
import { copyUniqueItems } from './collection.ts';
import type { CollectionSnapshot, ReorderRequest } from './domain.ts';
import { type SortableRuntime, TAG_COLLECTION } from './runtime.ts';

export type SortableController = Readonly<{
  /**
   * Replace the collection. Applied as a queued action, so it lands in FIFO
   * order with everything else the drag is doing — and it is **never
   * discarded**: even a replacement that invalidates the current gap publishes
   * first and cancels afterwards (D-25).
   */
  updateItems(items: readonly HTMLElement[]): void;
  /**
   * The authored presentation for `request` is committed (D-33).
   *
   * Call it from wherever the consumer's own commit lands — a `useLayoutEffect`
   * in React, the line after a synchronous DOM write anywhere else — passing
   * the **same request object** `onReorder` was handed. That identity is the
   * whole of the protocol: a request that is not the live operation's is
   * ignored and reported, which is what stops a timed-out operation's late
   * layout effect from releasing a newer operation's gate (I-35).
   *
   * It answers `ReorderResolution.accept({ presentation: true })`. Acknowledging
   * an operation that declared nothing is a contradiction the library reports;
   * declaring and then never acknowledging hits `readinessTimeout`.
   */
  ready(request: ReorderRequest): void;
  cancel(reason?: unknown): void;
  destroy(): void;
}>;

export function createSortableController(
  host: KernelHost,
  rt: SortableRuntime,
): SortableController {
  // Minted here and monotonic per controller, **not** derived from
  // `rt.snapshot.version`. Two updates queued inside one drain — two calls from
  // `onStart`, or from any hook — both read the same *published* version and
  // would stamp two distinct collections identically, which destroys version's
  // only job: being the identity of a snapshot. The counter is seeded from the
  // initial snapshot so the sequence stays continuous with it.
  let { version } = rt.snapshot;

  return {
    updateItems(items): void {
      // Copied and validated **here**, at call time, so a caller that keeps
      // mutating its own array cannot change a snapshot already queued, and a
      // duplicate is refused at the call that introduced it.
      //
      // **Before** the counter advances, deliberately. A refused call produced
      // no snapshot, so it must not consume a version either: leaving a gap in
      // the sequence would make the counter stop being a dense identity for
      // the collections that actually exist, and a consumer that recovers from
      // the `TypeError` and retries would see its successful update numbered
      // as though an invisible one had happened in between.
      const next = copyUniqueItems(items);

      version += 1;
      host.dispatch(TAG_COLLECTION, {
        items: next,
        version,
      } satisfies CollectionSnapshot);
    },
    /**
     * The identity check, and it is the **behavior's** — the kernel threads the
     * resolution as `unknown` and never learns what a request is (D-33).
     *
     * What it cannot catch is a *duplicate* of a still-live request: that
     * matches by definition, because `pendingRequest` is cleared at retirement
     * rather than at the first acknowledgement. Making a second one inert is
     * the kernel's, in whichever of its three windows it lands.
     */
    ready(request): void {
      if (request !== rt.pendingRequest) {
        // Stale, forged, or an acknowledgement that outlived its operation.
        // Reported, never applied — this is what stops operation A's late
        // layout effect from releasing operation B's gate (I-35).
        //
        // It takes the platform channel and does **not** reach `host.fail`: a
        // consumer-protocol error must never classify the operation the
        // consumer got right.
        if (DEV) {
          report(
            new Error(
              'drag: ready() received a request this operation never issued; ignored',
            ),
          );
        }

        return;
      }

      // The matching-but-undeclared contradiction is deliberately *not* checked
      // here. The behavior does not know what its own resolution declared —
      // `presentation` travels through `Prepared` to the kernel and never comes
      // back — so the kernel owns that report, at seal or on arrival.
      host.presentationCommitted();
    },

    cancel: host.cancel,
    destroy: host.destroy,
  };
}
