import { describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../../src/button-group/connected-button-group.ts';
import '../../src/button/split-button.ts';
import '../../src/button/switch-button.ts';
import { nextFrame, pixels, settleAnimations } from '../browser.ts';

/** The radii at the inline start of the group and at its inline end. */
type Sides = Readonly<{ start: number; end: number }>;
type Root = 'mx-connected-button-group' | 'mx-split-button';

const DIRECTIONS = [
  { name: 'no dir', rtl: false, group: '', ancestor: '', member: '' },
  { name: 'RTL group', rtl: true, group: 'rtl', ancestor: '', member: '' },
  { name: 'RTL ancestor', rtl: true, group: '', ancestor: 'rtl', member: '' },
  {
    name: 'LTR group in an RTL ancestor',
    rtl: false,
    group: 'ltr',
    ancestor: 'rtl',
    member: '',
  },
] as const;

type Direction = Readonly<{
  group: string;
  ancestor: string;
  member: string;
}>;

const VALUES = ['one', 'two', 'three'] as const;

async function create(
  tag: Root,
  { group, ancestor, member }: Direction,
): Promise<readonly [root: HTMLElement, members: readonly HTMLElement[]]> {
  const parent = document.createElement('div');
  parent.dir = ancestor;
  const root = document.createElement(tag);
  root.dir = group;
  parent.append(root);

  if (tag === 'mx-split-button') {
    root.append('Save');
  } else {
    root.append(
      ...VALUES.map((value) => {
        const element = document.createElement('mx-switch-button');
        element.dir = member;
        element.setAttribute('value', value);
        element.textContent = value;
        return element;
      }),
    );
  }

  document.body.append(parent);
  await nextFrame();
  const members =
    tag === 'mx-split-button'
      ? root.shadowRoot!.querySelectorAll<HTMLElement>('[part]')
      : root.querySelectorAll<HTMLElement>('mx-switch-button');

  return [
    root,
    [...members].filter(({ localName }) =>
      ['mx-button', 'mx-icon-button', 'mx-switch-button'].includes(localName),
    ),
  ];
}

function getImplementation(element: HTMLElement): HTMLElement {
  return element.shadowRoot!.querySelector<HTMLElement>('.host')!;
}

/** The computed radii at the physical left and right, each read twice. */
async function readCorners(element: HTMLElement): Promise<readonly number[]> {
  await nextFrame();
  await settleAnimations(element);
  const style = getComputedStyle(getImplementation(element));

  return [
    style.borderTopLeftRadius,
    style.borderBottomLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
  ].map(pixels);
}

/** What `readCorners` gives for `sides` in the given direction. */
function inDirection({ start, end }: Sides, rtl: boolean): readonly number[] {
  const [left, right] = rtl ? [end, start] : [start, end];

  return [left, left, right, right];
}

function fullOf(element: HTMLElement): number {
  return getImplementation(element).getBoundingClientRect().height / 2;
}

async function whilePressed<T>(
  element: HTMLElement,
  read: () => Promise<T>,
): Promise<T> {
  const { left, top, width, height } =
    getImplementation(element).getBoundingClientRect();
  await commands.pointerPress(left + width / 2, top + height / 2);
  try {
    return await read();
  } finally {
    await commands.pointerRelease();
  }
}

/** A corner token whose value is a length. */
async function cornerLength(
  contract: string,
  state: string,
  token: string,
): Promise<number> {
  const { values } = await commands.resolveTokenContract({
    contract,
    state,
    tokens: [token],
  });

  return pixels(String(values[token]));
}

const innerCorner = async (state: 'default' | 'pressed'): Promise<number> =>
  await cornerLength(
    'button-group.connected.small',
    state,
    'inner-corner.corner-size',
  );

/** A pressed button's outer corners are the button's own pressed shape. */
const pressedOuterCorner = async (): Promise<number> =>
  await cornerLength('button.size.small', 'pressed', 'container.shape');

const ENDS = [
  { end: 'first', index: 0 },
  { end: 'last', index: 2 },
] as const;

const sidesOf = (index: number, inner: number, outer: number): Sides =>
  index === 0 ? { start: outer, end: inner } : { start: inner, end: outer };

describe.each(DIRECTIONS)('connected group corners with $name', (direction) => {
  const { rtl } = direction;

  describe.each(ENDS)('$end button', ({ index }) => {
    it('should have its outer corners at the outer side at rest', async () => {
      const [, members] = await create('mx-connected-button-group', direction);
      const button = members[index]!;

      expect(await readCorners(button)).toEqual(
        inDirection(
          sidesOf(index, await innerCorner('default'), fullOf(button)),
          rtl,
        ),
      );
    });

    it('should have its outer corners at the outer side while pressed', async () => {
      const [, members] = await create('mx-connected-button-group', direction);
      const button = members[index]!;

      expect(
        await whilePressed(button, async () => await readCorners(button)),
      ).toEqual(
        inDirection(
          sidesOf(
            index,
            await innerCorner('pressed'),
            await pressedOuterCorner(),
          ),
          rtl,
        ),
      );
    });

    it('should have its outer corners at the outer side while selected and pressed', async () => {
      const [group, members] = await create(
        'mx-connected-button-group',
        direction,
      );
      group.setAttribute('value', VALUES[index]);
      const button = members[index]!;

      expect(
        await whilePressed(button, async () => await readCorners(button)),
      ).toEqual(
        inDirection(
          sidesOf(index, await innerCorner('pressed'), fullOf(button)),
          rtl,
        ),
      );
    });

    it('should be a pill when selected', async () => {
      const [group, members] = await create(
        'mx-connected-button-group',
        direction,
      );
      group.setAttribute('value', VALUES[index]);
      const button = members[index]!;
      const full = fullOf(button);

      expect(await readCorners(button)).toEqual([full, full, full, full]);
    });

    it('should have the overridden inner corners at the inner side', async () => {
      const [group, members] = await create(
        'mx-connected-button-group',
        direction,
      );
      group.style.setProperty('--md-button-group-inner-corner-size', '3px');
      const button = members[index]!;

      expect(await readCorners(button)).toEqual(
        inDirection(sidesOf(index, 3, fullOf(button)), rtl),
      );
    });
  });
});

describe('connected group corners when a direction changes or is mixed', () => {
  it.each(ENDS)(
    "should follow the group's dir on the $end button when it changes",
    async ({ index }) => {
      const [group, members] = await create(
        'mx-connected-button-group',
        DIRECTIONS[0],
      );
      const button = members[index]!;
      const sides = sidesOf(
        index,
        await innerCorner('default'),
        fullOf(button),
      );
      const ltr = await readCorners(button);
      group.dir = 'rtl';

      expect([ltr, await readCorners(button)]).toEqual([
        inDirection(sides, false),
        inDirection(sides, true),
      ]);
    },
  );

  it.each(
    ENDS.flatMap((end) => [
      { ...end, group: 'rtl', member: 'ltr' },
      { ...end, group: 'ltr', member: 'rtl' },
    ]),
  )(
    'should follow dir="$group" of the group on the $end button with dir="$member"',
    async ({ index, group, member }) => {
      const [, members] = await create('mx-connected-button-group', {
        group,
        ancestor: '',
        member,
      });
      const button = members[index]!;

      expect(await readCorners(button)).toEqual(
        inDirection(
          sidesOf(index, await innerCorner('default'), fullOf(button)),
          group === 'rtl',
        ),
      );
    },
  );
});

describe.each(DIRECTIONS)('mx-split-button corners with $name', (direction) => {
  const PARTS = [
    { part: 'leading', index: 0 },
    { part: 'trailing', index: 1 },
  ] as const;
  const { rtl } = direction;

  /** The part's inner corner in a split button with no `dir` anywhere. */
  async function restingInner(index: 0 | 1): Promise<number> {
    const [root, members] = await create('mx-split-button', DIRECTIONS[0]);
    const corners = await readCorners(members[index]!);
    root.parentElement!.remove();

    return corners[index === 0 ? 2 : 0]!;
  }

  describe.each(PARTS)('$part button', ({ part, index }) => {
    it('should have its outer corners at the outer side at rest', async () => {
      const inner = await restingInner(index);
      const [, members] = await create('mx-split-button', direction);
      const button = members[index]!;
      const full = fullOf(button);

      expect(inner).toBeLessThan(full);
      expect(await readCorners(button)).toEqual(
        inDirection(sidesOf(index, inner, full), rtl),
      );
    });

    it('should have its outer corners at the outer side while pressed', async () => {
      const [, members] = await create('mx-split-button', direction);
      const button = members[index]!;
      // The trailing button is a pill while it is pressed.
      const [inner, outer] =
        part === 'leading'
          ? [await innerCorner('pressed'), await pressedOuterCorner()]
          : [fullOf(button), fullOf(button)];

      expect(
        await whilePressed(button, async () => await readCorners(button)),
      ).toEqual(inDirection(sidesOf(index, inner, outer), rtl));
    });
  });

  it('should have a full trailing button while open', async () => {
    const [root, members] = await create('mx-split-button', direction);
    root.toggleAttribute('open', true);
    const full = fullOf(members[1]!);

    expect(await readCorners(members[1]!)).toEqual([full, full, full, full]);
  });
});
