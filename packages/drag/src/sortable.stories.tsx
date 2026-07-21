import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useLayoutEffect, useRef, useState, type JSX } from 'react';
import {
  ReorderResolution,
  sortable,
  type PlaceholderContext,
  type ReorderRequest,
} from './sortable.ts';
import css from './stories.module.css';

const meta: Meta = {
  title: 'Drag/Sortable',
};

export default meta;

/**
 * The React adapter for the engine's authored-presentation barrier: hands out a
 * promise for the next committed render and resolves it from a layout effect.
 *
 * `useLayoutEffect` runs after React has written the DOM but before the browser
 * paints, which is exactly the guarantee `presentationReady` asks for — the
 * authored order is on screen the instant the engine releases the lift.
 */
function createCommitTracker(): Readonly<{
  expect(): Promise<void>;
  flush(): void;
}> {
  let pending: (() => void) | null = null;

  return {
    expect() {
      // A superseded expectation is resolved rather than dropped, so an engine
      // waiting on it is never left hanging by a newer proposal.
      pending?.();
      return new Promise<void>((resolve) => {
        pending = resolve;
      });
    },

    flush() {
      const resolve = pending;
      pending = null;
      resolve?.();
    },
  };
}

/** Moves `item` to sit before `to` (or to the end) in a copy of `order`. */
function reordered<T>(order: readonly T[], item: T, to: T | null): T[] {
  const rest = order.filter((entry) => entry !== item);
  const index = to ? rest.indexOf(to) : rest.length;
  rest.splice(index, 0, item);
  return rest;
}

type SortableDemoProps = Readonly<{
  labels: readonly string[];
  className: string | undefined;
  itemClassName: string | undefined;
  hint: string;
  createPlaceholder?(context: PlaceholderContext): HTMLElement;
  renderItem?(label: string): JSX.Element;
}>;

/**
 * A controlled sortable collection, and the reference React integration of the
 * authored-presentation barrier.
 *
 * The engine proposes a reorder through the required, explicit `onReorder`
 * resolution. React owns the order state and commits it *from that resolution*,
 * handing back a `presentationReady` promise that a `useLayoutEffect` resolves
 * once the corresponding render has actually been committed to the DOM.
 *
 * That acknowledgement is what makes the drop correct rather than merely
 * lucky. `onFinish` is terminal — it runs after the engine has already released
 * the lift and placeholder — so committing there always renders too late and the
 * list visibly snaps back to its pre-drag order first. Committing from
 * `onReorder` overlaps the re-render with the landing animation, but on its own
 * that only wins a race: reduced motion skips the landing entirely, and a busy
 * main thread or a concurrent render can still lose it. `presentationReady`
 * removes the race — the engine holds the temporary presentation until React
 * says the authored DOM exists.
 */
function SortableDemo({
  labels,
  className,
  itemClassName,
  hint,
  createPlaceholder,
  renderItem,
}: SortableDemoProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState<readonly string[]>(labels);
  // The live element list, kept for `updateItems` after each commit.
  const elements = useRef(new Map<string, HTMLElement>());
  const orderRef = useRef(order);
  orderRef.current = order;
  const commits = useRef(createCommitTracker());

  // Resolves the acknowledgement handed to `onReorder` for this render. Runs
  // after React has written the DOM and before paint, so the engine releases
  // the lift onto an authored order that is already on screen.
  useLayoutEffect(() => {
    commits.current.flush();
  });

  useEffect(() => {
    const { current: container } = containerRef;

    if (!container) {
      return;
    }

    const items = (): HTMLElement[] =>
      orderRef.current
        .map((label) => elements.current.get(label))
        .filter((el): el is HTMLElement => el != null);

    const controller = sortable(container, {
      items,
      createPlaceholder,
      onReorder: (request: ReorderRequest) => {
        const { label } = request.item.dataset;

        if (label == null) {
          return ReorderResolution.reject();
        }

        const next = reordered(
          orderRef.current,
          label,
          request.after?.dataset['label'] ?? null,
        );
        // Registered *before* the state update, so the layout effect that
        // follows this render is the one that resolves it.
        const presentationReady = commits.current.expect();
        orderRef.current = next;
        setOrder(next);
        return ReorderResolution.accept(presentationReady);
      },
      // Terminal: the authored DOM is committed and the temporary presentation
      // released, so this is the right moment to resync the engine.
      onFinish: () => {
        controller.updateItems(items());
      },
    });

    return () => {
      controller.destroy();
    };
  }, [createPlaceholder]);

  return (
    <div className={css['stage']}>
      <p className={css['hint']}>{hint}</p>
      <div ref={containerRef} className={className}>
        {order.map((label) => (
          <div
            key={label}
            data-label={label}
            className={itemClassName}
            ref={(el) => {
              if (el) {
                elements.current.set(label, el);
              } else {
                elements.current.delete(label);
              }
            }}
          >
            {renderItem ? renderItem(label) : label}
          </div>
        ))}
      </div>
    </div>
  );
}

const LIST = ['Inbox', 'Drafts', 'Sent', 'Archive', 'Spam'];
const TILES = ['1', '2', '3', '4', '5', '6', '7', '8'];

export const List: StoryObj = {
  render: () => (
    <SortableDemo
      labels={LIST}
      className={css['list']}
      itemClassName={css['row']}
      hint="Drag a row to reorder the list, or focus one and use the arrow keys."
      renderItem={(label) => (
        <>
          <span className={css['handle']}>⠿</span>
          {label}
        </>
      )}
    />
  ),
};

export const Grid: StoryObj = {
  render: () => (
    <SortableDemo
      labels={TILES}
      className={css['grid']}
      itemClassName={css['tile']}
      hint="Drag a tile — a wrapping grid is one field of rectangles, so any direction works."
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
      className={css['list']}
      itemClassName={css['row']}
      hint="A consumer-provided placeholder fills the slot the dragged row left behind."
      createPlaceholder={makePlaceholder}
      renderItem={(label) => (
        <>
          <span className={css['handle']}>⠿</span>
          {label}
        </>
      )}
    />
  ),
};

export const ZoomedContext: StoryObj = {
  render: () => (
    <div className={css['zoomed']}>
      <SortableDemo
        labels={TILES}
        className={css['grid']}
        itemClassName={css['tile']}
        hint="The whole grid is CSS-zoomed; the lift and placeholder stay correctly sized."
      />
    </div>
  ),
};
