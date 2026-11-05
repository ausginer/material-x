import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState, type JSX } from 'react';
import { flushSync } from 'react-dom';
import { landing } from './sortable/landing.ts';
import { layoutAnimation } from './sortable/layout-animation.ts';
import type {
  PlaceholderContext,
  PlaceholderFactory,
} from './sortable/placement.ts';
import { xy } from './sortable/xy.ts';
import { y } from './sortable/y.ts';
import {
  ReorderResolution,
  sortable,
  type ReorderRequest,
  type SortableConfig,
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
  createPlaceholder?: PlaceholderFactory;
  /**
   * The axis rule. Exactly one survives the merge: `axis` is an atomic
   * capability slot, so a second fragment naming it is last-wins, and the loser
   * is never constructed. `y()` is the list rule, and `xy()` is the
   * wrapping-field rule.
   */
  axis?: SortableConfig['axis'];
  className?: string;
  itemClassName?: string;
}>;

/**
 * A controlled sortable collection, and the reference React integration of the
 * serial authored commit.
 *
 * The kernel proposes a reorder through the required, explicit `onReorder`
 * resolution. React owns the order state and commits it inside that resolution,
 * through `flushSync`. The handler then calls `controller.invalidate()` and
 * returns `accept()`. There is no declaration, no acknowledgement and no
 * `useLayoutEffect`, because the commit is serial: release → freeze proposal →
 * `onReorder` → your commit → `invalidate()` → your resolution → the library
 * restores its presentation invariants → the authoritative landing measurement
 * → landing → terminal.
 *
 * The resolution settles this drop. It does not tell the controller that the
 * collection changed. `items()` is pulled at construction and afterwards only
 * on `invalidate()`, so a commit that skips the call leaves every later drag
 * running against the construction-time order: under `y()` the drag fails, and
 * under `xy()` the drop lands wrong. `items()` returns a new array on each
 * pull, which gives the call its structural signal.
 *
 * This order makes the drop correct and not merely lucky. `onEnd` is terminal:
 * it runs after the kernel has already disposed the lift and placeholder. So a
 * commit there always renders too late, and the list visibly snaps back to its
 * pre-drag order first. Committing from `onReorder` without a barrier only wins
 * a race: reduced motion reduces the landing to zero, and a busy main thread or
 * a concurrent render can still lose the race. `flushSync` removes the race. It
 * is integration code, not a drag protocol. A consumer whose commit is
 * asynchronous writes `await` instead, and the library never has a render to
 * wait for in either case.
 *
 * The composition is the other half of the demo. Only the capabilities that
 * install something are composed: the axis rule, the landing animation and the
 * displacement animation. The consumer's own slots are plain keys in one config
 * object. Everything is assembled once at construction and is immutable for the
 * controller's life. A story that supplies no `placeholder` still gets a
 * placeholder: the mechanics are the behavior's, and the slot only customises
 * the element.
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
  // The live element list: the config's `items()` reads it, and `onReorder`
  // signals `controller.invalidate()` after each commit.
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

    // One required config, then fragments that the library merges. The second
    // argument carries every slot the library requires (`items`, `onReorder`
    // and `axis`), and each later argument is a partial config for a capability
    // that installs something. Nothing is branded and nothing is installed
    // until the merge has resolved every named slot.
    const controller = sortable(
      container,
      {
        // A pull source, not a snapshot.
        items,
        // `y()` and `xy()` are the installer, written as the slot's value and
        // not passed as a one-key fragment.
        axis: axis ?? y(),
        ...(createPlaceholder ? { placeholder: createPlaceholder } : null),
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
          // The serial authored commit. `flushSync` is React's commit barrier:
          // the resolution does not return until the authored DOM is on screen.
          // So the library never has a render to wait for, and the landing
          // measures a final list. A framework-specific barrier is integration
          // code, not a drag protocol.
          orderRef.current = next;
          flushSync(() => {
            setOrder(next);
          });
          // `items()` now returns the committed order, and the controller
          // re-pulls it only when told. Without this call, every later drag
          // runs against the order the controller was constructed with.
          controller.invalidate();
          return ReorderResolution.accept();
        },
      },
      landing(),
      layoutAnimation(),
    );

    return () => {
      void controller.requestDestroy();
    };
  }, [createPlaceholder, axis]);

  return (
    <div className={css['stage']}>
      <p className={css['hint']}>{hint}</p>
      {/*
        `role="list"` plus focusable rows, because the library provides neither.
        `sortable()` binds `keydown` on this container and the event has to
        originate inside a row. So a row that cannot take focus cannot be
        reordered from the keyboard at all, and the `hint` text would be false.
        Roles, focus order and any live-region announcement are the consumer's
        responsibility. That is the correct boundary for a headless library, and
        it is a documented limitation and not an omission.
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
 * The 2-D rule, selected explicitly. `xy()` measures both axes, which makes the
 * two axis behaviours visible side by side and not implied by the layout.
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
