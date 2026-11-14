/**
 * What every browser test shares: real input through Playwright, a log, the faults
 * the library reported, and cleanup between tests.
 */
import { afterEach, beforeEach } from 'vitest';
import { commands, server } from 'vitest/browser';
import { draggable, type Outcome } from '../../src/draggable.ts';
import { DragFault } from '../../src/fault.ts';
import { y } from '../../src/sortable/y.ts';
import {
  ReorderResolution,
  sortable,
  type SortableConfig,
  type SortableController,
} from '../../src/sortable.ts';
import './browser-commands.ts';

export { commands };

export const engine: string = server.browser;
export const isChromium: boolean = engine === 'chromium';

/** Runs its `react` synchronously inside the DOM write that triggers it. */
export class ReactionProbe extends HTMLElement {
  static readonly observedAttributes: readonly string[] = ['data-poke'];
  static react: (() => void) | null = null;

  // oxlint-disable-next-line class-methods-use-this -- a custom element reaction
  connectedCallback(): void {
    ReactionProbe.react?.();
  }

  // oxlint-disable-next-line class-methods-use-this -- a custom element reaction
  attributeChangedCallback(): void {
    ReactionProbe.react?.();
  }
}

if (!customElements.get('reaction-probe')) {
  customElements.define('reaction-probe', ReactionProbe);
}

export const log: string[] = [];
export const faults: DragFault[] = [];
export const foreignErrors: unknown[] = [];
export const rejections: unknown[] = [];
/** Every click the platform produced: runs before the guard's listener. */
export const rawClicks: string[] = [];
/** Every click that reached the page's own code. */
export const deliveredClicks: string[] = [];

const cleanups: Array<() => unknown> = [];

/** Registers cleanup that runs after this test, last in first out. */
export function onCleanup(cleanup: () => unknown): void {
  cleanups.push(cleanup);
}

const describeTarget = (event: Event): string => {
  const element = event.target as Element;

  return element.id || element.tagName;
};

addEventListener('error', (event) => {
  if (event.error instanceof DragFault) {
    faults.push(event.error);
  } else {
    foreignErrors.push(event.error);
  }

  event.preventDefault();
});
addEventListener('unhandledrejection', (event) => {
  rejections.push(event.reason);
  event.preventDefault();
});
addEventListener(
  'click',
  (event) => {
    rawClicks.push(describeTarget(event));
  },
  { capture: true },
);
document.addEventListener('click', (event) => {
  deliveredClicks.push(describeTarget(event));
});

export function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export type RefusalCounts = Readonly<{ trusted: number; untrusted: number }>;

export function refusals(): RefusalCounts {
  return (
    ((globalThis as Record<string, unknown>)['__dragRefused'] as
      | RefusalCounts
      | undefined) ?? { trusted: 0, untrusted: 0 }
  );
}

beforeEach(() => {
  log.length = 0;
  faults.length = 0;
  foreignErrors.length = 0;
  rejections.length = 0;
  rawClicks.length = 0;
  deliveredClicks.length = 0;
  ReactionProbe.react = null;
  delete (globalThis as Record<string, unknown>)['__dragRefused'];
  document.body.style.margin = '0';
  scrollTo(0, 0);
});

afterEach(async () => {
  await commands.pointerUp().catch(() => {});

  while (cleanups.length > 0) {
    // oxlint-disable-next-line no-await-in-loop -- cleanup runs in reverse order
    await cleanups.pop()!();
  }

  document.body.replaceChildren();

  // `drag:DRI-6`, across every test: no trusted event is ever refused.
  if (refusals().trusted > 0) {
    throw new Error(`refused ${refusals().trusted} trusted events`);
  }

  // The guard expires in the task after a release. A later test's click is not
  // that one's.
  await wait(0);
});

/** Lets `count` rendering opportunities pass. */
export function frames(count = 2): Promise<void> {
  return new Promise((resolve) => {
    const step = (left: number): void => {
      if (left === 0) {
        resolve();
      } else {
        requestAnimationFrame(() => {
          step(left - 1);
        });
      }
    };

    step(count);
  });
}

export type Center = Readonly<{
  x: number;
  y: number;
  left: number;
  top: number;
}>;

/** An element's center and top-left, in the viewport of the test's page. */
export function centerOf(target: string | Element): Center {
  const element =
    typeof target === 'string' ? document.querySelector(target)! : target;
  const { left, top, width, height } = element.getBoundingClientRect();

  return { x: left + width / 2, y: top + height / 2, left, top };
}

export type Target = string | Element;

/** Presses at the target's center and stays below the threshold. */
export async function press(target: Target): Promise<Center> {
  const start = centerOf(target);

  await commands.pointerMove(start.x, start.y);
  await commands.pointerDown();
  return start;
}

/** Presses on the target and carries the pointer past the threshold. */
export async function grab(
  target: Target,
  dx = 0,
  dy = 40,
): Promise<{ x: number; y: number }> {
  const start = await press(target);

  await commands.pointerMove(start.x + dx / 2, start.y + dy / 2, 2);
  await commands.pointerMove(start.x + dx, start.y + dy, 2);
  await frames();
  return { x: start.x + dx, y: start.y + dy };
}

/** Moves a held pointer in two stages, so each frame resolves the gap. */
export async function moveHeld(x: number, y_: number): Promise<void> {
  await commands.pointerMove(x, y_, 3);
  await frames();
}

export async function release(): Promise<void> {
  await commands.pointerUp();
  await frames();
}

export async function dragAndDrop(target: Target, dy: number): Promise<void> {
  await grab(target, 0, dy);
  await release();
}

export function makeList(
  count: number,
  parent: ParentNode & Node = document.body,
  css = '',
): HTMLElement {
  const owner = parent.ownerDocument ?? document;
  const list = owner.createElement('div');

  list.id = 'list';
  list.style.cssText = `width:200px;${css}`;

  for (let i = 0; i < count; i += 1) {
    const row = owner.createElement('div');

    row.className = 'row';
    row.id = `r${i}`;
    row.textContent = `Row ${i}`;
    row.style.cssText = 'height:40px;touch-action:none;user-select:none';
    list.append(row);
  }

  parent.append(list);
  return list;
}

export const rowsOf = (list: HTMLElement): HTMLElement[] =>
  [...list.children].filter(
    (element) => !element.hasAttribute('data-drag-placeholder'),
  ) as HTMLElement[];

export const order = (list: HTMLElement): string =>
  rowsOf(list)
    .map((row) => row.id)
    .join();

/** A sortable over `list` that commits every reorder and logs what it hears. */
export function basicSortable(
  list: HTMLElement,
  extra: Partial<SortableConfig> = {},
): SortableController {
  const controller = sortable(list, {
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

  onCleanup(() => controller.requestDestroy());
  return controller;
}

/** The pressed row. */
export function targetOf(event: Event): HTMLElement {
  return event.target as HTMLElement;
}

/** `draggable`, destroyed after the test. */
export const managed: typeof draggable = ((
  root: HTMLElement,
  behavior: never,
) => {
  const controller = draggable(root, behavior);

  onCleanup(() => controller.requestDestroy());
  return controller;
}) as typeof draggable;

/** Whether the library left anything behind on the list. */
export function isClean(list: HTMLElement): boolean {
  return (
    !list.querySelector('[data-drag-placeholder]') &&
    rowsOf(list).every(
      (row) =>
        !row.style.transform &&
        !row.style.position &&
        !row.hasAttribute('popover'),
    )
  );
}

export function faultMessages(): string[] {
  return faults.map((fault) => (fault.cause as Error).message);
}

/** Logs an outcome, with a cancel's origin. */
export function noteOutcome(outcome: Outcome): void {
  log.push(
    outcome.type === 'canceled'
      ? `end:canceled:${outcome.origin}`
      : `end:${outcome.type}`,
  );
}
