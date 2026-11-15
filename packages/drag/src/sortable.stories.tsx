import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState, type JSX } from 'react';
import { flushSync } from 'react-dom';
import { landing } from './sortable/landing.ts';
import { layoutAnimation } from './sortable/layout-animation.ts';
import type { PlaceholderFactory } from './sortable/placement.ts';
import { xy } from './sortable/xy.ts';
import { y } from './sortable/y.ts';
import {
  ReorderResolution,
  sortable,
  type SortableConfig,
} from './sortable.ts';
import css from './stories.module.css';

const meta: Meta = {
  title: 'Drag/Sortable',
};

export default meta;

type DemoProps = Readonly<{
  labels: readonly string[];
  hint: string;
  axis?: SortableConfig['axis'];
  placeholder?: PlaceholderFactory;
  /** Tiles instead of rows: no grip glyph. */
  grid?: boolean;
}>;

const listAxis = y();
const gridAxis = xy();

/**
 * React owns the order and commits it inside `onReorder`, with `flushSync`, so the
 * list is in its new order before the verdict returns. `items()` is pulled at each
 * press, so nothing else tells the sortable that the order changed.
 *
 * The library writes no roles and no focus order. The rows are focusable because
 * the keyboard commands start from a focused item.
 */
function SortableDemo({
  labels,
  hint,
  axis = listAxis,
  placeholder,
  grid = false,
}: DemoProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState(labels);

  useEffect(() => {
    const container = containerRef.current!;
    const controller = sortable(container, {
      items: () => [...container.querySelectorAll<HTMLElement>('[data-label]')],
      axis,
      ...(placeholder ? { placeholder } : {}),
      landing: landing(),
      displacement: layoutAnimation(),
      onReorder({ from, to }) {
        flushSync(() => {
          setOrder((current) => {
            const moved = current[from]!;

            return current.toSpliced(from, 1).toSpliced(to, 0, moved);
          });
        });
        return ReorderResolution.accept();
      },
    });

    return () => {
      void controller.requestDestroy();
    };
  }, [axis, placeholder]);

  return (
    <div className={css['stage']}>
      <p className={css['hint']}>{hint}</p>
      <div
        ref={containerRef}
        className={grid ? css['grid'] : css['list']}
        role="list"
      >
        {order.map((label) => (
          <div
            key={label}
            role="listitem"
            tabIndex={0}
            data-label={label}
            className={grid ? css['tile'] : css['row']}
          >
            {grid ? null : <span className={css['glyph']}>⠿</span>}
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

const LIST: readonly string[] = ['Inbox', 'Drafts', 'Sent', 'Archive', 'Spam'];
const TILES: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8'];

export const List: StoryObj = {
  render: () => (
    <SortableDemo
      labels={LIST}
      hint="Drag a row to reorder the list, or focus one and use the arrow keys. Escape cancels a drag mid-flight."
    />
  ),
};

export const Grid: StoryObj = {
  render: () => (
    <SortableDemo
      labels={TILES}
      axis={gridAxis}
      grid
      hint="Drag a tile in any direction. xy() treats the wrapping grid as one field of rectangles and measures both axes."
    />
  ),
};

/** The library sizes the element, marks it and hides it from assistive technology. */
const makePlaceholder: PlaceholderFactory = () => {
  const element = document.createElement('div');

  element.className = css['slot']!;
  element.textContent = 'Drop here';
  return element;
};

export const CustomPlaceholder: StoryObj = {
  render: () => (
    <SortableDemo
      labels={LIST}
      placeholder={makePlaceholder}
      hint="The placeholder element is the consumer's. The library sizes it to the dragged row and hides it from assistive technology."
    />
  ),
};

export const ZoomedContext: StoryObj = {
  render: () => (
    <div className={css['zoomed']}>
      <SortableDemo
        labels={LIST}
        hint="The whole list is CSS-zoomed. The lifted row and the placeholder keep the zoomed size."
      />
    </div>
  ),
};
