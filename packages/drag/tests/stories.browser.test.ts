/**
 * Each story, mounted with React as Storybook renders it and driven with real
 * pointer input. A sortable story reorders twice, because a story that commits
 * wrongly can survive one drag. A free-drag story's accepted drop must stay where
 * it was dropped after the lift lets go.
 */
import { createElement, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { ResizeHandle } from '../src/draggable.stories.tsx';
import {
  AsyncDropConfirmation,
  Interactive,
  TransformedStage,
} from '../src/free-drag.stories.tsx';
import {
  CustomPlaceholder,
  Grid,
  List,
  ZoomedContext,
} from '../src/sortable.stories.tsx';
import {
  commands,
  frames,
  isSafari,
  onCleanup,
  wait,
} from './support/harness.ts';

/** Longer than any landing or displacement animation the stories run. */
const SETTLE = 700;

/** What `mount` reads of a story: its args and its render function. */
type Story = Readonly<{ args?: object; render?: unknown }>;

async function mount(story: Story): Promise<HTMLElement> {
  const host = document.createElement('div');
  const root = createRoot(host);
  const render = story.render as (args: object) => ReactNode;
  const Rendered = (): ReactNode => render(story.args ?? {});

  document.body.append(host);
  flushSync(() => {
    root.render(createElement(Rendered));
  });
  onCleanup(() => {
    root.unmount();
    host.remove();
  });
  await frames();
  return host;
}

function centerOf(element: Element): { x: number; y: number } {
  const { left, top, width, height } = element.getBoundingClientRect();

  return { x: left + width / 2, y: top + height / 2 };
}

/** Presses at `from`, travels to `to` over several frames and keeps holding. */
async function carry(
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> {
  await commands.pointerMove(from.x, from.y);
  await commands.pointerDown();

  for (let step = 1; step <= 8; step += 1) {
    // oxlint-disable-next-line no-await-in-loop -- one frame per sample
    await commands.pointerMove(
      from.x + ((to.x - from.x) * step) / 8,
      from.y + ((to.y - from.y) * step) / 8,
    );
    // oxlint-disable-next-line no-await-in-loop -- one frame per sample
    await frames(1);
  }

  await frames();
}

async function drop(): Promise<void> {
  await commands.pointerUp();
  await wait(SETTLE);
}

function labels(host: HTMLElement): string[] {
  return [...host.querySelectorAll<HTMLElement>('[data-label]')].map(
    (item) => item.dataset['label']!,
  );
}

/** Carries the first item onto the third and drops it there. */
async function reorderFirstToThird(host: HTMLElement): Promise<void> {
  const items = host.querySelectorAll('[data-label]');

  await carry(centerOf(items[0]!), centerOf(items[2]!));
  await drop();
}

describe('Sortable stories', () => {
  for (const [name, story, initial] of [
    ['List', List, ['Inbox', 'Drafts', 'Sent', 'Archive', 'Spam']],
    [
      'CustomPlaceholder',
      CustomPlaceholder,
      ['Inbox', 'Drafts', 'Sent', 'Archive', 'Spam'],
    ],
    [
      'ZoomedContext',
      ZoomedContext,
      ['Inbox', 'Drafts', 'Sent', 'Archive', 'Spam'],
    ],
    ['Grid', Grid, ['1', '2', '3', '4', '5', '6', '7', '8']],
  ] as const) {
    it(`should reorder ${name} twice in a row`, async () => {
      const host = await mount(story);
      const [a, b, c, ...rest] = initial;

      await reorderFirstToThird(host);
      expect(labels(host)).toEqual([b, c, a, ...rest]);

      await reorderFirstToThird(host);
      expect(labels(host)).toEqual([c, a, b, ...rest]);
    });
  }
});

/** Drags the box by `(dx, dy)` and returns its rectangle just before the drop. */
async function dragBox(
  box: HTMLElement,
  dx: number,
  dy: number,
): Promise<DOMRect> {
  const start = centerOf(box);

  await carry(start, { x: start.x + dx, y: start.y + dy });
  return box.getBoundingClientRect();
}

function expectSameRect(actual: DOMRect, expected: DOMRect): void {
  expect(Math.abs(actual.left - expected.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual.top - expected.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual.width - expected.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual.height - expected.height)).toBeLessThanOrEqual(1);
}

describe('Free Drag stories', () => {
  it('should keep a bounded Interactive box where it was dropped', async () => {
    const host = await mount(Interactive);
    const box = host.querySelector<HTMLElement>('[class*="box"]')!;
    const before = box.getBoundingClientRect();
    const dropped = await dragBox(box, 120, 60);

    await drop();
    expect(dropped.left - before.left).toBeGreaterThan(100);
    expectSameRect(box.getBoundingClientRect(), dropped);
  });

  // In Safari the box ends 16 px lower than where it was dropped
  // (`drag:DRF-51`), so the row is expected to fail there.
  (isSafari ? it.fails : it)(
    'should keep a TransformedStage box where it was dropped',
    async () => {
      const host = await mount(TransformedStage);
      const box = host.querySelector<HTMLElement>('[class*="box"]')!;
      const before = box.getBoundingClientRect();
      const dropped = await dragBox(box, 100, 50);

      await drop();
      expect(dropped.left - before.left).toBeGreaterThan(80);
      expectSameRect(box.getBoundingClientRect(), dropped);
    },
  );

  it('should pass the AsyncDropConfirmation status through saving to accepted', async () => {
    const host = await mount(AsyncDropConfirmation);
    const status = host.querySelector('[data-status]')!;
    const seen: string[] = [status.textContent];
    const observer = new MutationObserver(() => {
      if (seen.at(-1) !== status.textContent) {
        seen.push(status.textContent);
      }
    });

    observer.observe(status, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    onCleanup(() => {
      observer.disconnect();
    });
    await dragBox(host.querySelector<HTMLElement>('[class*="box"]')!, 80, 40);
    await commands.pointerUp();
    await expect.poll(() => status.textContent).toBe('accepted');
    expect(seen).toEqual(['idle', 'dragging…', 'saving…', 'accepted']);
  });
});

describe('Custom Behavior stories', () => {
  it('should resize with ResizeHandle and restore the size on Escape', async () => {
    const host = await mount(ResizeHandle);
    const target = host.querySelector<HTMLElement>('[class*="resizable"]')!;
    const grip = host.querySelector<HTMLElement>('[class*="grip"]')!;
    const initial = { width: target.offsetWidth, height: target.offsetHeight };

    const start = centerOf(grip);

    await carry(start, { x: start.x + 40, y: start.y + 30 });
    await drop();

    const resized = { width: target.offsetWidth, height: target.offsetHeight };

    expect(resized).not.toEqual(initial);

    const again = centerOf(grip);

    await carry(again, { x: again.x + 40, y: again.y + 30 });
    expect(target.offsetWidth).not.toBe(resized.width);
    await commands.keyPress('Escape');
    await drop();
    expect({ width: target.offsetWidth, height: target.offsetHeight }).toEqual(
      resized,
    );
  });
});
