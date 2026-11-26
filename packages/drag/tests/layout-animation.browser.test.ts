/**
 * `layoutAnimation`: which rows a committed move animates, and how each animation
 * composes with what the page already renders on that row.
 */
import { describe, expect, it } from 'vitest';
import { layoutAnimation } from '../src/sortable/layout-animation.ts';
import type { SortableConfig } from '../src/sortable.ts';
import {
  basicSortable,
  commands,
  faults,
  frames,
  onCleanup,
} from './support/harness.ts';

const ROW_HEIGHT = 40;
const DURATION = 500;

type FixtureOptions = Readonly<{
  count?: number;
  /** Appended to the root's style, such as an ancestor transform. */
  rootCss?: string;
  /** Runs on each row before the sortable is created. */
  decorate?(row: HTMLElement, index: number): void;
  /** Adds children that are not items. */
  extras?(root: HTMLElement): void;
  config?: Partial<SortableConfig>;
}>;

/**
 * A column of 40px rows at the viewport's top-left, with `layoutAnimation`. The
 * pointer's y in viewport pixels then names a row: row `i` spans `40i` to
 * `40(i + 1)` with no ancestor transform.
 */
function build(options: FixtureOptions = {}): HTMLElement[] {
  const root = document.createElement('div');

  root.style.cssText = `position:absolute;top:0;left:0;width:200px;${options.rootCss ?? ''}`;
  document.body.append(root);

  const items: HTMLElement[] = [];

  for (let i = 0; i < (options.count ?? 3); i += 1) {
    const row = document.createElement('div');

    row.id = `r${i}`;
    row.style.cssText = `display:block;width:100px;height:${ROW_HEIGHT}px;touch-action:none;user-select:none`;
    options.decorate?.(row, i);
    root.append(row);
    items.push(row);
  }

  options.extras?.(root);
  basicSortable(root, {
    items: () => items,
    displacement: layoutAnimation({
      timing: () => ({ duration: DURATION, easing: 'ease-out' }),
    }),
    ...options.config,
  });
  return items;
}

/** Presses at `pressY` and crosses the threshold at `holdY`, committing no move. */
async function activate(pressY: number, holdY: number): Promise<void> {
  await commands.pointerMove(10, pressY);
  await commands.pointerDown();
  await commands.pointerMove(10, holdY, 2);
  await frames();
}

/** Moves the held pointer to `y` and lets the move resolve. */
async function dragTo(y: number): Promise<void> {
  await commands.pointerMove(10, y, 2);
  await frames();
}

/** The indices of the rows that carry an animation. */
function animatedRows(items: readonly HTMLElement[]): number[] {
  return items
    .map((item, index) => (item.getAnimations().length > 0 ? index : -1))
    .filter((index) => index !== -1);
}

/** The one animation `layoutAnimation` started on `row`, paused at `time`. */
function seek(row: HTMLElement, time: number): Animation {
  const animations = row.getAnimations();

  expect(animations).toHaveLength(1);

  const [animation] = animations;

  animation!.pause();
  animation!.currentTime = time;
  return animation!;
}

type Travel = Readonly<{
  /** How far the move carried the row's settled box, in viewport pixels. */
  travel: number;
  /** How far the animation's first instant draws the row from its settled box. */
  carried: number;
  /** The computed `translate` at the first instant, in the row's own units. */
  translate: string;
}>;

/**
 * Activates on row 0 with no committed move, then commits one move to `toY` and
 * reads row `index` at three instants: before the move, settled after it, and at
 * its animation's start.
 */
async function travelOf(
  items: readonly HTMLElement[],
  index: number,
  pressY: number,
  holdY: number,
  toY: number,
): Promise<Travel> {
  const row = items[index]!;

  await activate(pressY, holdY);

  const before = row.getBoundingClientRect().top;

  await dragTo(toY);

  // Past the active interval the animation applies nothing. `getAnimations()`
  // leaves it out there, so the one reference serves both instants.
  const animation = seek(row, DURATION);
  const after = row.getBoundingClientRect().top;

  animation.currentTime = 0;
  return {
    travel: after - before,
    carried: row.getBoundingClientRect().top - after,
    translate: getComputedStyle(row).translate,
  };
}

/** A 40px card filling `host`, used as the row's `visual`. */
function appendCard(host: HTMLElement): void {
  const card = document.createElement('div');

  card.style.cssText = `display:block;width:100px;height:${ROW_HEIGHT}px`;
  host.append(card);
}

const firstChild = (item: HTMLElement): HTMLElement =>
  item.firstElementChild as HTMLElement;

describe('layoutAnimation rows', () => {
  it('should animate only the row the move crossed', async () => {
    const items = build();

    await activate(10, 30);
    await dragTo(55);
    expect(animatedRows(items)).toEqual([1]);
  });

  it('should animate every row a move across two slots crossed', async () => {
    const items = build();

    await activate(10, 30);
    await dragTo(110);
    expect(animatedRows(items)).toEqual([1, 2]);
  });

  it('should animate nothing when the pointer moves without moving the gap', async () => {
    const items = build();

    await activate(10, 30);
    await dragTo(35);
    expect(animatedRows(items)).toEqual([]);
  });

  it('should start each animation where the row stood before the move', async () => {
    const items = build();
    const { travel, carried, translate } = await travelOf(items, 1, 10, 30, 55);

    expect(travel).toBeCloseTo(-ROW_HEIGHT, 1);
    expect(carried).toBeCloseTo(ROW_HEIGHT, 1);
    expect(translate).toBe(`0px ${ROW_HEIGHT}px`);
  });

  it('should never animate the dragged item', async () => {
    const items = build({ count: 4 });
    const dragged = items[2]!;

    // From the middle, upward: the placeholder starts right after the dragged
    // item, so the span a move upward crosses ends at it.
    await activate(90, 110);
    await dragTo(10);
    expect(animatedRows(items)).toEqual([0, 1]);
    expect(dragged.getAnimations()).toEqual([]);
  });

  it('should never animate a sibling that is not an item', async () => {
    const decoration = document.createElement('div');
    const items = build({
      extras(root) {
        decoration.style.height = `${ROW_HEIGHT}px`;
        // Between rows 1 and 2, so the placeholder's move to the gap before row 2
        // crosses it.
        root.children[1]!.after(decoration);
      },
    });

    await activate(10, 30);
    await dragTo(95);
    expect(animatedRows(items)).toEqual([1]);
    expect(decoration.getAnimations()).toEqual([]);
  });

  it('should never animate the placeholder', async () => {
    build();
    await activate(10, 30);
    await dragTo(55);

    const placeholder = document.querySelector<HTMLElement>(
      '[data-drag-placeholder]',
    )!;

    expect(placeholder.getAnimations()).toEqual([]);
    expect(faults).toEqual([]);
  });
});

describe('layoutAnimation composition', () => {
  it('should leave an authored transform rendering while a row animates', async () => {
    const items = build({
      decorate(row, index) {
        if (index === 1) {
          row.style.transform = 'rotate(4deg)';
        }
      },
    });
    const row = items[1]!;
    const authored = getComputedStyle(row).transform;

    await activate(10, 30);
    await dragTo(55);
    seek(row, DURATION / 2);
    expect(getComputedStyle(row).transform).toBe(authored);
    expect(row.style.transform).toBe('rotate(4deg)');
  });

  it('should add the animation to an authored translate', async () => {
    const items = build({
      decorate(row, index) {
        if (index === 1) {
          row.style.translate = '0 7px';
        }
      },
    });
    const row = items[1]!;

    await activate(10, 30);
    await dragTo(55);

    const animation = seek(row, 0);

    expect(getComputedStyle(row).translate).toBe('0px 47px');
    animation.currentTime = DURATION;
    expect(getComputedStyle(row).translate).toBe('0px 7px');
    expect(row.style.translate).toBe('0px 7px');
  });

  it('should leave a consumer animation on transform running', async () => {
    const items = build();
    const row = items[1]!;
    // Held still: the contract needs `invalidate()` for a row that moves mid-drag.
    const consumer = row.animate(
      [{ transform: 'translateX(10px)' }, { transform: 'translateX(10px)' }],
      { duration: 10_000 },
    );

    onCleanup(() => {
      consumer.cancel();
    });
    await activate(10, 30);
    await dragTo(55);
    expect(consumer.playState).toBe('running');
    expect(row.getAnimations()).toHaveLength(2);
  });

  it('should add the animation to a consumer animation on translate', async () => {
    const items = build();
    const row = items[1]!;
    // On x only: an offset on y is the consumer's geometry, which the axis sees.
    const consumer = row.animate(
      [{ translate: '10px 0px' }, { translate: '10px 0px' }],
      { duration: 10_000 },
    );

    onCleanup(() => {
      consumer.cancel();
    });
    await activate(10, 30);
    await dragTo(55);

    const ours = row.getAnimations().find((running) => running !== consumer)!;

    // Before the pause, which would restart a cancelled animation.
    expect(consumer.playState).toBe('running');
    consumer.pause();
    ours.pause();
    ours.currentTime = 0;
    expect(getComputedStyle(row).translate).toBe('10px 40px');
    ours.currentTime = DURATION;
    expect(getComputedStyle(row).translate).toBe('10px');
  });

  it('should leave a row where it was drawn when a second move crosses it mid-flight', async () => {
    const items = build();
    const row = items[1]!;

    await activate(10, 30);
    await dragTo(55);

    const first = seek(row, DURATION / 2);

    await first.ready;

    const midway = row.getBoundingClientRect().top;

    // Back over row 1, which is still halfway through its first animation.
    await dragTo(15);
    expect(first.playState).toBe('idle');
    seek(row, 0);
    expect(row.getBoundingClientRect().top).toBeCloseTo(midway, 0);
  });

  it('should render one slot of travel under an ancestor scale()', async () => {
    // Every viewport quantity doubles: a 40px slot travels 80 viewport pixels.
    const items = build({ rootCss: 'transform:scale(2);transform-origin:0 0' });
    const { travel, carried, translate } = await travelOf(
      items,
      1,
      20,
      60,
      110,
    );

    expect(travel).toBeCloseTo(-2 * ROW_HEIGHT, 1);
    expect(carried).toBeCloseTo(2 * ROW_HEIGHT, 1);
    expect(translate).toBe(`0px ${ROW_HEIGHT}px`);
  });
});

describe('layoutAnimation with a visual that is not the item', () => {
  const stage = 'transform:scale(2);transform-origin:0 0';

  it('should render one slot of travel under an ancestor scale()', async () => {
    const items = build({
      rootCss: stage,
      decorate: appendCard,
      config: { visual: firstChild },
    });
    // The lifted card leaves its row in the flow, so the pointer crosses one
    // more box than it does when the row itself is lifted.
    const { travel, carried, translate } = await travelOf(
      items,
      1,
      20,
      60,
      210,
    );

    expect(travel).toBeCloseTo(-2 * ROW_HEIGHT, 1);
    expect(carried).toBeCloseTo(2 * ROW_HEIGHT, 1);
    expect(translate).toBe(`0px ${ROW_HEIGHT}px`);
  });

  it('should ignore a transformed wrapper between the item and its visual', async () => {
    const items = build({
      rootCss: stage,
      decorate(row) {
        const wrapper = document.createElement('div');

        wrapper.style.cssText =
          'display:block;transform:scale(1.5);transform-origin:0 0';
        appendCard(wrapper);
        row.append(wrapper);
      },
      config: { visual: (item) => firstChild(firstChild(item)) },
    });
    const { travel, carried, translate } = await travelOf(
      items,
      1,
      20,
      60,
      250,
    );

    expect(travel).toBeCloseTo(-2 * ROW_HEIGHT, 1);
    expect(carried).toBeCloseTo(2 * ROW_HEIGHT, 1);
    expect(translate).toBe(`0px ${ROW_HEIGHT}px`);
  });

  it('should ignore a transform authored on the dragged item itself', async () => {
    const items = build({
      decorate(row, index) {
        if (index === 0) {
          row.style.transform = 'scale(1.5)';
          row.style.transformOrigin = '0 0';
        }

        appendCard(row);
      },
      config: { visual: firstChild },
    });
    const { travel, carried, translate } = await travelOf(
      items,
      1,
      10,
      30,
      105,
    );

    expect(travel).toBeCloseTo(-ROW_HEIGHT, 1);
    expect(carried).toBeCloseTo(ROW_HEIGHT, 1);
    expect(translate).toBe(`0px ${ROW_HEIGHT}px`);
  });
});
