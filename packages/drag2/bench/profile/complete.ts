/**
 * The **`complete` sortable composition**, as a page to record.
 *
 * It mirrors `bench/size/measure.ts`'s row of the same name — `sortable`,
 * `y()`, `landing()`, `layoutAnimation()` — so the graph a profile executes is
 * the graph that row measures. The four imports below are the four public
 * entries that row names, and nothing reaches past them.
 *
 * **Everything else is the default.** No `visual`, `box`, `handle` or
 * placeholder factory, no `threshold`, no `onStart`/`onEnd`/`onError`, no
 * scrolling, no error or cancellation path. A recording of this page is a
 * recording of one ordinary pointer drag, and every frame in it belongs to the
 * library or to the browser.
 *
 * **No marks.** The first recording is meant to show the natural execution
 * order; instrumentation would be a second question and would change what the
 * first one shows.
 */
import { landing } from '../../src/sortable/landing.ts';
import { layoutAnimation } from '../../src/sortable/layout-animation.ts';
import { y } from '../../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../../src/sortable.ts';

const list = document.querySelector<HTMLElement>('#list')!;

/**
 * The collection, owned here and pulled by the library. **Array identity is the
 * signal** (D-44): the same reference comes back until the order changes.
 */
let items: readonly HTMLElement[] = [...list.children] as HTMLElement[];

const controller = sortable(
  list,
  {
    items: () => items,
    axis: y(),
    onReorder({ item, from, to, after }) {
      // The whole of the consumer's work, synchronous: the request carries the
      // gap's identity neighbours, so the move is one `insertBefore` — `after`
      // is `null` for an end gap, which appends.
      list.insertBefore(item, after);
      // Not read back from `list.children`, which still holds the placeholder.
      items = items.toSpliced(from, 1).toSpliced(to, 0, item);
      // The behavior keeps the collection it last pulled until it is told to
      // pull again, so the next operation would otherwise use the old order.
      controller.invalidate();
      return ReorderResolution.accept();
    },
  },
  landing(),
  layoutAnimation(),
);
