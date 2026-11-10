import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState, type JSX } from 'react';
import { flushSync } from 'react-dom';
import { landing } from './sortable/landing.ts';
import { layoutAnimation } from './sortable/layout-animation.ts';
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

const LABELS: readonly string[] = [
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
];

type DemoProps = Readonly<{
  axis: SortableConfig['axis'];
  containerClass: string;
  itemClass: string;
  hint: string;
}>;

/**
 * React owns the order and commits it inside `onReorder`, with `flushSync`, so the
 * list is in its new order before the verdict returns. `items()` is pulled at each
 * press, so nothing else tells the sortable that the order changed.
 */
function SortableDemo({
  axis,
  containerClass,
  itemClass,
  hint,
}: DemoProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState(LABELS);

  useEffect(() => {
    const container = containerRef.current!;
    const controller = sortable(container, {
      items: () => [...container.querySelectorAll<HTMLElement>('[data-label]')],
      axis,
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
  }, [axis]);

  return (
    <div className={css['stage']}>
      <p className={css['hint']}>{hint}</p>
      <div ref={containerRef} className={containerClass}>
        {order.map((label) => (
          <div
            key={label}
            data-label={label}
            className={itemClass}
            tabIndex={0}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

const listAxis = y();
const gridAxis = xy();

export const List: StoryObj = {
  render: () => (
    <SortableDemo
      axis={listAxis}
      containerClass={css['list']!}
      itemClass={css['row']!}
      hint="Drag a row, or focus it and press the arrow keys. Escape cancels."
    />
  ),
};

export const Grid: StoryObj = {
  render: () => (
    <SortableDemo
      axis={gridAxis}
      containerClass={css['grid']!}
      itemClass={css['cell']!}
      hint="The same sortable, with xy() for a wrapping field."
    />
  ),
};
