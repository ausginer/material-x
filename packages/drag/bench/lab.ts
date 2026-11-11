/**
 * Runs in the page for `compare.ts`: one composition per scenario, written the way a
 * consumer writes it. The production and prototype arms bundle this file, each with
 * its own `src`.
 */
import { freeDrag, FreeDragResolution } from '../src/free-drag.ts';
import { landing } from '../src/sortable/landing.ts';
import { layoutAnimation } from '../src/sortable/layout-animation.ts';
import { y } from '../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../src/sortable.ts';

type Options = Readonly<{
  count: number;
  /** `items()` returns a held array, so that the library's own share is separated. */
  cached: boolean;
  landed: boolean;
  /** The consumer repairs focus itself, because this arm's library does not. */
  refocus: boolean;
}>;

export function makeRows(count: number): HTMLElement {
  const list = document.createElement('div');

  list.style.cssText = 'position:relative;width:200px;';

  for (let i = 0; i < count; i += 1) {
    const item = document.createElement('div');

    item.id = `i${i}`;
    item.tabIndex = 0;
    item.textContent = String(i);
    item.style.cssText =
      'height:40px;box-sizing:border-box;background:#ccd;border:1px solid #889;position:relative;touch-action:none;user-select:none;';
    list.append(item);
  }

  document.body.append(list);
  return list;
}

const lab = {
  log: [] as string[],
  destroy: (): Promise<void> => Promise.resolve(),

  /** A list with no behavior mounted, for the in-page driver's own cost. */
  list(count: number): void {
    makeRows(count);
  },

  sortable({ count, cached, landed, refocus }: Options): void {
    const list = makeRows(count);
    let items = [...list.children] as HTMLElement[];
    let moved: HTMLElement | null = null;
    const controller = sortable(list, {
      items: cached
        ? () => items
        : () =>
            [...list.children].filter((element) => element.id) as HTMLElement[],
      axis: y(),
      ...(landed ? { landing: landing({ duration: 50 }) } : {}),
      displacement: layoutAnimation({ duration: 50 }),
      onReorder({ item, next, from, to }) {
        list.insertBefore(item, next);

        if (cached) {
          items = items.toSpliced(from, 1).toSpliced(to, 0, item);
        }

        moved = item;

        return ReorderResolution.accept();
      },
      onEnd(result) {
        if (refocus) {
          moved?.focus();
        }

        lab.log.push(result.type);
      },
    });

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
