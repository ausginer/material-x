import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState, type JSX } from 'react';
import { sortable, type PlaceholderContext } from './sortable.ts';
import css from './stories.module.css';

const meta: Meta = {
  title: 'Drag/Sortable',
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
  className: string | undefined;
  itemClassName: string | undefined;
  hint: string;
  createPlaceholder?(context: PlaceholderContext): HTMLElement;
  renderItem?(label: string): JSX.Element;
}>;

/**
 * A controlled sortable collection: the engine proposes a reorder, React owns
 * the order state and commits it, and `updateItems` keeps the engine in sync.
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
      touchAction: 'none',
      createPlaceholder,
      onReorder(request) {
        const { label } = request.item.dataset;

        if (label == null) {
          return { accepted: false };
        }

        const next = reordered(
          orderRef.current,
          label,
          request.after?.dataset['label'] ?? null,
        );
        orderRef.current = next;
        setOrder(next);
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
      hint="Drag a row to reorder the list."
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
