/**
 * What the focused checks reach from the page. A check's setup runs here through
 * `page.evaluate`, and its input comes from the driver, as real browser input.
 */
import { draggable } from '@ydinjs/drag/draggable.js';
import { DragFault } from '@ydinjs/drag/fault.js';
import { bounds } from '@ydinjs/drag/free-drag/bounds.js';
import { freeDrag, FreeDragResolution } from '@ydinjs/drag/free-drag.js';
import { landing } from '@ydinjs/drag/sortable/landing.js';
import { layoutAnimation } from '@ydinjs/drag/sortable/layout-animation.js';
import { xy } from '@ydinjs/drag/sortable/xy.js';
import { y } from '@ydinjs/drag/sortable/y.js';
import { ReorderResolution, sortable } from '@ydinjs/drag/sortable.js';
import { canvasGroup } from '../examples/canvas-group.ts';
import { dropZone } from '../examples/drop-zone.ts';
import { resizeHandle } from '../examples/resize-handle.ts';

type Reaction = (() => void) | null;

/** Runs its `react` synchronously inside the DOM write that triggers it. */
class ReactionProbe extends HTMLElement {
  static readonly observedAttributes = ['data-poke'];
  static react: Reaction = null;

  connectedCallback(): void {
    ReactionProbe.react?.();
  }

  attributeChangedCallback(): void {
    ReactionProbe.react?.();
  }
}

customElements.define('reaction-probe', ReactionProbe);

const log: string[] = [];
const faults: DragFault[] = [];
const foreignErrors: unknown[] = [];
const rejections: unknown[] = [];
/** Every click the platform produced: runs before the guard's listener. */
const rawClicks: string[] = [];
/** Every click that reached the page's own code. */
const deliveredClicks: string[] = [];

addEventListener('error', (event) => {
  if (event.error instanceof DragFault) {
    faults.push(event.error);
  } else {
    foreignErrors.push(event.error);
  }
});
addEventListener('unhandledrejection', (event) => {
  rejections.push(event.reason);
});
addEventListener(
  'click',
  (event) => {
    rawClicks.push(
      (event.target as Element).id || (event.target as Element).tagName,
    );
  },
  { capture: true },
);
document.addEventListener('click', (event) => {
  deliveredClicks.push(
    (event.target as Element).id || (event.target as Element).tagName,
  );
});

function makeList(
  count: number,
  parent: HTMLElement = document.body,
  css = '',
): HTMLElement {
  const list = parent.ownerDocument.createElement('div');

  list.id = 'list';
  list.style.cssText = `width:200px;${css}`;

  for (let i = 0; i < count; i += 1) {
    const row = parent.ownerDocument.createElement('div');

    row.className = 'row';
    row.id = `r${i}`;
    row.textContent = `Row ${i}`;
    list.append(row);
  }

  parent.append(list);
  return list;
}

const rowsOf = (list: HTMLElement): HTMLElement[] =>
  [...list.children].filter(
    (element) => !element.hasAttribute('data-drag-placeholder'),
  ) as HTMLElement[];

/** A sortable over `list` that commits every reorder and logs what it hears. */
function basicSortable(list: HTMLElement, extra: Record<string, unknown> = {}) {
  return sortable(list, {
    items: () => rowsOf(list),
    axis: y(),
    onStart() {
      log.push('start');
    },
    onReorder({ item, next }) {
      list.insertBefore(item, next);
      return ReorderResolution.accept();
    },
    onEnd(result) {
      log.push(`end:${result.type}`);
    },
    ...extra,
  });
}

const order = (list: HTMLElement): string =>
  rowsOf(list)
    .map((row) => row.id)
    .join();

/** Whether the library left anything behind on the list. */
const clean = (list: HTMLElement): boolean =>
  !list.querySelector('[data-drag-placeholder]') &&
  rowsOf(list).every(
    (row) =>
      !row.style.transform &&
      !row.style.position &&
      !row.hasAttribute('popover'),
  );

Object.assign(globalThis, {
  lab: {
    draggable,
    DragFault,
    freeDrag,
    FreeDragResolution,
    bounds,
    ReorderResolution,
    sortable,
    landing,
    layoutAnimation,
    xy,
    y,
    canvasGroup,
    dropZone,
    resizeHandle,
    ReactionProbe,
    log,
    faults,
    foreignErrors,
    rejections,
    rawClicks,
    deliveredClicks,
    makeList,
    rowsOf,
    basicSortable,
    order,
    clean,
  },
});
