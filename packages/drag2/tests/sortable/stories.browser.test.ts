/**
 * The Sortable stories are the package's reference React integration, so they
 * are held to what D-44 asks of a consumer: a committed reorder changes what
 * `items()` returns, and the controller learns it only from
 * `controller.invalidate()`. A demo that commits without signalling works for
 * exactly one drag — every later one runs against the construction-time
 * snapshot, which is why each case here drags twice.
 *
 * `List` is the `y()` failure: the stale slot order stops matching flow order,
 * the `DEV` G3-linear instrument throws, and the lift unwinds home. `Grid` is
 * the same fault with no instrument to catch it: under `xy()` the second drop
 * completes as a no-op. Together they show the defect is the collection rather
 * than the axis rule.
 */
import type { StoryObj } from '@storybook/react-vite';
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { CustomPlaceholder, Grid, List } from '../../src/sortable.stories.tsx';
import '../support/browser-commands.ts';

const cleanup: Array<() => void> = [];

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

async function frame(): Promise<void> {
  return await new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function mount(story: StoryObj): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  flushSync(() => {
    root.render(createElement(story.render as () => never));
  });
  cleanup.push(() => {
    root.unmount();
    host.remove();
  });
  await frame();
  await frame();
  return host.querySelector<HTMLElement>('[role="list"]')!;
}

function labels(list: HTMLElement): string[] {
  return [...list.children].map(
    (child) => (child as HTMLElement).dataset['label'] ?? '_',
  );
}

/** Presses the first item, travels `(dx, dy)` 4 px per frame, releases and settles. */
async function drag(list: HTMLElement, dx: number, dy: number): Promise<void> {
  const box = list.children[0]!.getBoundingClientRect();
  const x = box.left + 20;
  const y = box.top + box.height / 2;
  const distance = Math.max(Math.abs(dx), Math.abs(dy));

  await commands.pointerPress(x, y);

  for (let travelled = 4; travelled <= distance; travelled += 4) {
    // oxlint-disable-next-line no-await-in-loop
    await commands.pointerSweep(
      x + (dx * travelled) / distance,
      y + (dy * travelled) / distance,
      1,
    );
    // oxlint-disable-next-line no-await-in-loop
    await frame();
  }

  await commands.pointerRelease();

  for (let i = 0; i < 30; i += 1) {
    // oxlint-disable-next-line no-await-in-loop
    await frame();
  }
}

describe('Sortable stories', () => {
  it('should land the second vertical drag in List where it was released', async () => {
    const list = await mount(List);

    await drag(list, 0, 128);
    expect(labels(list)).toEqual([
      'Drafts',
      'Sent',
      'Archive',
      'Inbox',
      'Spam',
    ]);

    await drag(list, 0, 128);
    expect(labels(list)).toEqual([
      'Sent',
      'Archive',
      'Inbox',
      'Drafts',
      'Spam',
    ]);
  });

  it('should land the second vertical drag in CustomPlaceholder where it was released', async () => {
    const list = await mount(CustomPlaceholder);

    await drag(list, 0, 128);
    await drag(list, 0, 128);
    expect(labels(list)).toEqual([
      'Sent',
      'Archive',
      'Inbox',
      'Drafts',
      'Spam',
    ]);
  });

  it('should land the second horizontal drag in Grid where it was released', async () => {
    const list = await mount(Grid);

    await drag(list, 160, 0);
    expect(labels(list)).toEqual(['2', '3', '1', '4', '5', '6', '7', '8']);

    await drag(list, 160, 0);
    expect(labels(list)).toEqual(['3', '1', '2', '4', '5', '6', '7', '8']);
  });
});
