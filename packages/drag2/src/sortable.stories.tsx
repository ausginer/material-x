import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState, type JSX } from 'react';
import { flushSync } from 'react-dom';
import { callbacks } from './sortable/callbacks.ts';
import { landing } from './sortable/landing.ts';
import { layoutAnimation } from './sortable/layout-animation.ts';
import {
  placeholder,
  type PlaceholderContext,
} from './sortable/placeholder.ts';
import { xy } from './sortable/xy.ts';
import { y } from './sortable/y.ts';
import {
  ReorderResolution,
  sortable,
  type ReorderRequest,
  type SortableFeature,
} from './sortable.ts';
import css from './stories.module.css';

const meta: Meta = {
  title: 'Drag2/Sortable',
};

export default meta;

/** Moves `item` to sit before `to` (or to the end) in a copy of `order`. */
function reordered<T>(order: readonly T[], item: T, to: T | null): T[] {
  const rest = order.filter((entry) => entry !== item);
  const index = to ? rest.indexOf(to) : rest.length;
  rest.splice(index, 0, item);
  return rest;
}

type SortableDemoProps = Readonly<{
  labels: readonly string[];
  hint: string;
  createPlaceholder?(context: PlaceholderContext): HTMLElement;
  /**
   * The axis rule. **Exactly one is installed** — they claim the same slot, and
   * `assemble()` refuses a composition that names both. `y()` is the list rule;
   * `xy()` is the wrapping-field rule.
   */
  axis?: SortableFeature;
  className?: string;
  itemClassName?: string;
}>;

/**
 * A controlled sortable collection, and the reference React integration of the
 * authored-presentation gate (D-33).
 *
 * The kernel proposes a reorder through the required, explicit `onReorder`
 * resolution. React owns the order state and commits it *from that resolution*,
 * **declaring** that a presentation follows and **acknowledging** it from a
 * `useLayoutEffect` once the corresponding render has been committed to the DOM.
 *
 * That acknowledgement is what makes the drop correct rather than merely
 * lucky. `onFinish` is terminal — it runs after the kernel has already released
 * the lift and placeholder — so committing there always renders too late and the
 * list visibly snaps back to its pre-drag order first. Committing from
 * `onReorder` overlaps the re-render with the landing animation, but on its own
 * that only wins a race: reduced motion collapses the landing to zero, and a
 * busy main thread or a concurrent render can still lose it. The declaration
 * removes the race — the two settlement gates are independent, and the kernel
 * holds the temporary presentation until React says the authored DOM exists.
 *
 * **The whole integration is the two lines below and one ref.** There is no
 * commit tracker: the protocol supersedes nothing, creates nothing and drops
 * nothing, because the identity it keys on is the `request` object `onReorder`
 * was already handed. What survives is one irreducible obligation — only the
 * consumer knows when its own commit landed, so only the consumer can call
 * `ready()`. A declaration that is never acknowledged is a deliberate cost: it
 * stalls for `readinessTimeout` and then reports `FAILURE_PRESENTATION_READY`,
 * loudly, rather than completing over an unrendered DOM.
 *
 * The composition is the other half of the demo. Nothing is inferred from an
 * options object: the axis rule, the landing animation, the displacement
 * animation and the callbacks are each an installed feature, assembled once at
 * construction and immutable for the controller's life. A story that installs
 * no `placeholder()` still gets a placeholder — the mechanics are the
 * behavior's, and the feature only customises the element.
 */
function SortableDemo({
  labels,
  hint,
  createPlaceholder,
  axis,
  className,
  itemClassName,
}: SortableDemoProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState<readonly string[]>(labels);
  // The live element list, kept for `updateItems` after each commit.
  const elements = useRef(new Map<string, HTMLElement>());
  const orderRef = useRef(order);
  orderRef.current = order;

  useEffect(() => {
    const { current: container } = containerRef;

    if (!container) {
      return;
    }

    const items = (): HTMLElement[] =>
      orderRef.current
        .map((label) => elements.current.get(label))
        .filter((el): el is HTMLElement => el != null);

    // `sortable()` takes a *snapshot*, not a getter: the collection is replaced
    // through `controller.updateItems`, which lands as a queued action in FIFO
    // order with everything else the drag is doing.
    const controller = sortable(
      container,
      items(),
      axis ?? y(),
      landing(),
      layoutAnimation(),
      ...(createPlaceholder
        ? [placeholder({ create: createPlaceholder })]
        : ([] as readonly SortableFeature[])),
      callbacks({
        onReorder: (request: ReorderRequest) => {
          const { label } = request.item.dataset;

          if (label == null) {
            return ReorderResolution.reject('unlabelled item');
          }

          const next = reordered(
            orderRef.current,
            label,
            request.after?.dataset['label'] ?? null,
          );
          // **The serial authored commit** (D-41). `flushSync` is React's
          // commit barrier, and awaiting it here is the whole of the
          // migration from the readiness protocol: the resolution does not
          // return until the authored DOM is on screen, so the library never
          // has a render to wait for and the landing measures a final list.
          // A framework-specific barrier is integration code, not a drag
          // protocol.
          orderRef.current = next;
          flushSync(() => {
            setOrder(next);
          });
          return ReorderResolution.accept();
        },
        // Terminal: the authored DOM is committed and the temporary
        // presentation released, so this is the right moment to resync.
        onFinish: () => {
          controller.updateItems(items());
        },
      }),
    );

    return () => {
      void controller.destroy();
    };
  }, [createPlaceholder, axis]);

  return (
    <div className={css['stage']}>
      <p className={css['hint']}>{hint}</p>
      {/*
        `role="list"` plus focusable rows, because **the library provides
        neither**. `sortable()` binds `keydown` on this container and the event
        has to originate inside a row, so a row that cannot take focus cannot be
        reordered from the keyboard at all — the hint below would be a lie. Roles,
        focus order and any live-region announcement are the consumer's, which is
        the correct boundary for a headless library and a documented limitation
        rather than an omission.
      */}
      <div ref={containerRef} className={className ?? css['list']} role="list">
        {order.map((label) => (
          <div
            key={label}
            role="listitem"
            tabIndex={0}
            data-label={label}
            className={itemClassName ?? css['row']}
            ref={(el) => {
              if (el) {
                elements.current.set(label, el);
              } else {
                elements.current.delete(label);
              }
            }}
          >
            {itemClassName === undefined && (
              <span className={css['handle']}>⠿</span>
            )}
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

const LIST = ['Inbox', 'Drafts', 'Sent', 'Archive', 'Spam'];

export const List: StoryObj = {
  render: () => (
    <SortableDemo
      labels={LIST}
      hint="Drag a row to reorder the list, or focus one and use the arrow keys. Escape cancels a drag mid-flight."
    />
  ),
};

const TILES = ['1', '2', '3', '4', '5', '6', '7', '8'];

/**
 * The 2-D rule, and the parity row L-8 corrected: the shipped package has no
 * axis concept at all, so its Grid story is its List story with different CSS.
 * drag2's `y()` was a *narrowing* of that, and `xy()` restores the shipped
 * default as an explicitly selected rule — which is what makes the two
 * behaviours visible side by side rather than implied by the layout.
 */
export const Grid: StoryObj = {
  render: () => (
    <SortableDemo
      labels={TILES}
      axis={xy()}
      className={css['grid']}
      itemClassName={css['tile']}
      hint="Drag a tile in any direction — a wrapping grid is one field of rectangles, and xy() measures both axes. The same drag under y() would propose nothing, because every tile in a row shares its Y."
    />
  ),
};

/** A consumer-supplied placeholder styled to preview the drop slot. */
function makePlaceholder({ rect }: PlaceholderContext): HTMLElement {
  const el = document.createElement('div');
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.style.borderRadius = '8px';
  el.style.border = '2px dashed #6750a4';
  el.style.background = 'rgb(103 80 164 / 12%)';
  el.style.boxSizing = 'border-box';
  return el;
}

export const CustomPlaceholder: StoryObj = {
  render: () => (
    <SortableDemo
      labels={LIST}
      hint="A consumer-provided placeholder fills the slot the dragged row left behind. Only the element is the consumer's — the sizing, the slot mirroring and the aria-hidden are the behavior's, and are not configurable away."
      createPlaceholder={makePlaceholder}
    />
  ),
};

export const ZoomedContext: StoryObj = {
  render: () => (
    <div className={css['zoomed']}>
      <SortableDemo
        labels={LIST}
        hint="The whole list is CSS-zoomed; the lift and placeholder stay correctly sized, because the inherited zoom falls out of the single box-quad traversal that measures the visual."
      />
    </div>
  ),
};
