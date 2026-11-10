/** `lab.ts`, for drag2's API. */
/* eslint-disable import-x/no-relative-packages -- drag2 is the measured arm, not a dependency */
import { freeDrag, FreeDragResolution } from '../../drag2/src/free-drag.ts';
import { landing } from '../../drag2/src/sortable/landing.ts';
import { layoutAnimation } from '../../drag2/src/sortable/layout-animation.ts';
import { y } from '../../drag2/src/sortable/y.ts';
import {
  ReorderResolution,
  sortable,
  type SortableController,
} from '../../drag2/src/sortable.ts';
import { makeRows } from './lab.ts';

type Options = Readonly<{
  count: number;
  cached: boolean;
  landed: boolean;
  refocus: boolean;
}>;

const lab = {
  log: [] as string[],
  destroy: (): Promise<void> => Promise.resolve(),

  sortable({ count, cached, landed, refocus }: Options): void {
    const list = makeRows(count);
    let items = [...list.children] as HTMLElement[];
    let moved: HTMLElement | null = null;
    const pull = cached
      ? (): readonly HTMLElement[] => items
      : (): readonly HTMLElement[] =>
          [...list.children].filter((element) => element.id) as HTMLElement[];
    const held: { controller: SortableController | null } = {
      controller: null,
    };
    const config = {
      items: pull,
      axis: y(),
      onReorder({
        item,
        after,
        from,
        to,
      }: Readonly<{
        item: HTMLElement;
        after: HTMLElement | null;
        from: number;
        to: number;
      }>) {
        list.insertBefore(item, after);

        if (cached) {
          items = items.toSpliced(from, 1).toSpliced(to, 0, item);
        }

        // drag2 keeps the collection until told to pull again.
        held.controller!.invalidate();

        moved = item;

        return ReorderResolution.accept();
      },
      onEnd(result: Readonly<{ type: string }>) {
        if (refocus) {
          moved?.focus();
        }

        lab.log.push(result.type);
      },
    };
    const controller = landed
      ? sortable(
          list,
          config,
          landing({ duration: 50 }),
          layoutAnimation({ duration: 50 }),
        )
      : sortable(list, config, layoutAnimation({ duration: 50 }));

    held.controller = controller;
    lab.destroy = () => {
      const destroyed = controller.requestDestroy();

      list.remove();
      return destroyed;
    };
  },

  freeDrag(): void {
    const box = makeRows(1).firstElementChild as HTMLElement;

    freeDrag(box, {
      onDrop: () => FreeDragResolution.accept(),
      onEnd(result) {
        lab.log.push(result.type);
      },
    });
  },
};

Object.assign(globalThis, { lab });
