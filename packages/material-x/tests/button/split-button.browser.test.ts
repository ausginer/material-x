import { describe, expect, it, vi, type Mock } from 'vitest';
import { commands, server, userEvent } from 'vitest/browser';
import '../../src/button/button.ts';
import '../../src/button/icon-button.ts';
import '../../src/button/split-button.ts';
import { nextFrame, settleAnimations, srgb } from '../browser.ts';
import { TAB } from '../focus-indicator.ts';
import type { AccessibilityNode } from '../support/accessibility-commands.node.ts';

type Part = 'leading' | 'trailing';

const PARTS = ['leading', 'trailing'] as const;

function createSplitButton(
  attributes: Readonly<Record<string, string>> = {},
): HTMLElementTagNameMap['mx-split-button'] {
  const splitButton = document.createElement('mx-split-button');
  splitButton.id = 'split';
  splitButton.textContent = 'Save';

  for (const [name, value] of Object.entries(attributes)) {
    splitButton.setAttribute(name, value);
  }

  document.body.append(splitButton);
  return splitButton;
}

function getMember(splitButton: HTMLElement, part: Part): HTMLElement {
  return splitButton.shadowRoot!.querySelector<HTMLElement>(
    `[part="${part}"]`,
  )!;
}

function getNativeButton(
  splitButton: HTMLElement,
  part: Part,
): HTMLButtonElement {
  return getMember(
    splitButton,
    part,
  ).shadowRoot!.querySelector<HTMLButtonElement>('.host')!;
}

function getTrailingButton(splitButton: HTMLElement): HTMLButtonElement {
  return getNativeButton(splitButton, 'trailing');
}

describe('mx-split-button events', () => {
  it('should expose a secondary action without exposing its internal click', () => {
    const splitButton = createSplitButton();
    const click: Mock<EventListener> = vi.fn();
    const secondaryAction = vi.fn<(event: Event) => void>();

    splitButton.addEventListener('click', click);
    splitButton.addEventListener('secondaryaction', secondaryAction);

    getTrailingButton(splitButton).click();

    expect(click).not.toHaveBeenCalled();
    expect(secondaryAction).toHaveBeenCalledOnce();
  });

  it('should emit a bubbling composed non-cancelable secondary action', () => {
    const splitButton = createSplitButton();
    const events: Event[] = [];

    splitButton.addEventListener('secondaryaction', (event) => {
      events.push(event);
    });

    getTrailingButton(splitButton).click();

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        bubbles: true,
        cancelable: false,
        composed: true,
        target: splitButton,
      }),
    );
  });
});

describe('mx-split-button secondarylabel', () => {
  it('should name the trailing button', async () => {
    const splitButton = createSplitButton({ secondarylabel: 'More' });
    await nextFrame();

    expect(getTrailingButton(splitButton).getAttribute('aria-label')).toBe(
      'More',
    );
  });

  it('should name the trailing button after it is set as a property', async () => {
    const splitButton = createSplitButton();
    splitButton.secondarylabel = 'More';
    await nextFrame();

    expect(getTrailingButton(splitButton).getAttribute('aria-label')).toBe(
      'More',
    );
  });

  it('should rename the trailing button when it changes', async () => {
    const splitButton = createSplitButton({ secondarylabel: 'More' });
    await nextFrame();
    splitButton.setAttribute('secondarylabel', 'Other');
    await nextFrame();

    expect(getTrailingButton(splitButton).getAttribute('aria-label')).toBe(
      'Other',
    );
  });

  it('should leave the trailing button without a name when it is removed', async () => {
    const splitButton = createSplitButton({ secondarylabel: 'More' });
    await nextFrame();
    const button = getTrailingButton(splitButton);
    const before = button.getAttribute('aria-label');
    splitButton.secondarylabel = null;
    await nextFrame();

    expect([before, button.getAttribute('aria-label')]).toEqual(['More', null]);
  });

  it('should name neither the leading button nor the host', async () => {
    const splitButton = createSplitButton({ secondarylabel: 'More' });
    await nextFrame();

    expect(
      [getNativeButton(splitButton, 'leading'), splitButton].map((element) =>
        element.hasAttribute('aria-label'),
      ),
    ).toEqual([false, false]);
  });

  it('should leave a host aria-label on neither button', async () => {
    const splitButton = createSplitButton({ 'aria-label': 'Host' });
    await nextFrame();

    expect(
      PARTS.map((part) =>
        getNativeButton(splitButton, part).hasAttribute('aria-label'),
      ),
    ).toEqual([false, false]);
  });
});

describe('mx-split-button open', () => {
  it('should be collapsed on the trailing button from the first render', async () => {
    const splitButton = createSplitButton();
    await nextFrame();

    expect(getTrailingButton(splitButton).getAttribute('aria-expanded')).toBe(
      'false',
    );
  });

  it('should be expanded on the trailing button from the first render', async () => {
    const splitButton = createSplitButton({ open: '' });
    await nextFrame();

    expect(getTrailingButton(splitButton).getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('should be on the trailing button after each change', async () => {
    const splitButton = createSplitButton();
    const readings: Array<string | null> = [];

    for (const open of [true, false, true]) {
      splitButton.open = open;
      await nextFrame();
      readings.push(
        getTrailingButton(splitButton).getAttribute('aria-expanded'),
      );
    }

    expect(readings).toEqual(['true', 'false', 'true']);
  });

  it('should be on neither the leading button nor the host', async () => {
    const splitButton = createSplitButton({ open: '' });
    await nextFrame();

    expect(
      [getNativeButton(splitButton, 'leading'), splitButton].map((element) =>
        element.hasAttribute('aria-expanded'),
      ),
    ).toEqual([false, false]);
  });
});

// Only Chromium exposes its accessibility tree to the test.
describe.runIf(server.browser === 'chromium')(
  'mx-split-button accessibility tree',
  () => {
    function collectButtons(node: AccessibilityNode): AccessibilityNode[] {
      return [
        ...(node.role === 'button' ? [node] : []),
        ...node.children.flatMap(collectButtons),
      ];
    }

    async function readButtons(
      attributes: Readonly<Record<string, string>>,
    ): Promise<ReadonlyArray<Readonly<{ name: string; expanded: unknown }>>> {
      createSplitButton(attributes);
      await nextFrame();

      return collectButtons(
        await commands.readAccessibilityTree('#split', true),
      ).map(({ name, properties }) => ({
        name,
        expanded: properties['expanded'],
      }));
    }

    it('should expose the label as the trailing button name', async () => {
      expect(await readButtons({ secondarylabel: 'More' })).toEqual([
        { name: 'Save', expanded: undefined },
        { name: 'More', expanded: false },
      ]);
    });

    it('should expose the trailing button as expanded with open', async () => {
      expect(await readButtons({ secondarylabel: 'More', open: '' })).toEqual([
        { name: 'Save', expanded: undefined },
        { name: 'More', expanded: true },
      ]);
    });

    it('should expose no name of the trailing button without a label', async () => {
      expect(await readButtons({})).toEqual([
        { name: 'Save', expanded: undefined },
        { name: '', expanded: false },
      ]);
    });

    it('should expose no text of the icon', async () => {
      createSplitButton({ secondarylabel: 'More' });
      await nextFrame();
      const tree = await commands.readAccessibilityTree('#split', true);

      expect(JSON.stringify(tree)).not.toContain('keyboard_arrow_down');
    });
  },
);

describe('mx-split-button disabled', () => {
  type SplitButton = ReturnType<typeof createSplitButton>;

  type Way = Readonly<{ when: string; create: () => Promise<SplitButton> }>;

  async function setLater(
    attributes: Readonly<Record<string, string>>,
    change: (splitButton: SplitButton) => void,
  ): Promise<SplitButton> {
    const splitButton = createSplitButton(attributes);
    await nextFrame();
    change(splitButton);
    return splitButton;
  }

  const DISABLED: readonly Way[] = [
    {
      when: 'as an initial attribute',
      create: async () => await setLater({ disabled: '' }, () => {}),
    },
    {
      when: 'as an attribute set later',
      create: async () =>
        await setLater({}, (button) => button.setAttribute('disabled', '')),
    },
    {
      when: 'as a property',
      create: async () =>
        await setLater({}, (button) => {
          button.disabled = true;
        }),
    },
  ];

  const ENABLED: readonly Way[] = [
    {
      when: 'removed as an attribute',
      create: async () =>
        await setLater({ disabled: '' }, (button) =>
          button.removeAttribute('disabled'),
        ),
    },
    {
      when: 'removed as a property',
      create: async () =>
        await setLater({ disabled: '' }, (button) => {
          button.disabled = false;
        }),
    },
  ];

  async function create(way: Way): Promise<SplitButton> {
    const splitButton = await way.create();
    await nextFrame();
    return splitButton;
  }

  /** The names of the events that reach the host from now on. */
  function recordEvents(splitButton: HTMLElement): readonly string[] {
    const events: string[] = [];

    for (const type of ['click', 'secondaryaction']) {
      splitButton.addEventListener(type, () => events.push(type));
    }

    return events;
  }

  async function clickPart(splitButton: HTMLElement, part: Part) {
    const { left, top, width, height } = getNativeButton(
      splitButton,
      part,
    ).getBoundingClientRect();

    await commands.pointerPress(left + width / 2, top + height / 2);
    await commands.pointerRelease();
  }

  async function pressKeysOnPart(splitButton: HTMLElement, part: Part) {
    getNativeButton(splitButton, part).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
  }

  function focusedPart(splitButton: HTMLElement): string | null {
    return splitButton.shadowRoot!.activeElement?.getAttribute('part') ?? null;
  }

  /** The parts that `count` presses of Tab focus, from before the element. */
  async function tabStops(
    splitButton: HTMLElement,
    count: number,
  ): Promise<ReadonlyArray<string | null>> {
    const before = document.createElement('button');
    splitButton.before(before);
    before.focus();
    const stops: Array<string | null> = [];

    for (let i = 0; i < count; i += 1) {
      await userEvent.keyboard(TAB);
      stops.push(focusedPart(splitButton));
    }

    return stops;
  }

  async function colorsOf(member: HTMLElement) {
    await settleAnimations(member);
    const { backgroundColor, color } = getComputedStyle(
      member.shadowRoot!.querySelector('.host')!,
    );

    return { background: srgb(backgroundColor), color: srgb(color) };
  }

  /** The colors of the button that a part is, on its own in the page. */
  async function expectedColors(part: Part, isDisabled: boolean) {
    const button = document.createElement(
      part === 'leading' ? 'mx-button' : 'mx-icon-button',
    );
    button.disabled = isDisabled;
    document.body.append(button);
    await nextFrame();

    return await colorsOf(button);
  }

  describe.each(DISABLED)('$when', (way) => {
    it('should disable both native buttons', async () => {
      const splitButton = await create(way);

      expect(
        PARTS.map((part) => getNativeButton(splitButton, part).disabled),
      ).toEqual([true, true]);
    });

    it('should leave no tab stop', async () => {
      const splitButton = await create(way);

      expect(await tabStops(splitButton, 1)).toEqual([null]);
    });

    it.each(PARTS)(
      'should fire no event for a click on the %s button',
      async (part) => {
        const splitButton = await create(way);
        const events = recordEvents(splitButton);
        await clickPart(splitButton, part);

        expect(events).toEqual([]);
      },
    );

    it.each(PARTS)(
      'should fire no event for a key on the %s button',
      async (part) => {
        const splitButton = await create(way);
        const events = recordEvents(splitButton);
        await pressKeysOnPart(splitButton, part);

        expect(events).toEqual([]);
      },
    );

    it.each(PARTS)('should draw the %s button as disabled', async (part) => {
      const splitButton = await create(way);

      expect(await colorsOf(getMember(splitButton, part))).toEqual(
        await expectedColors(part, true),
      );
    });
  });

  describe.each(ENABLED)('$when', (way) => {
    it('should enable both native buttons', async () => {
      const splitButton = await create(way);

      expect(
        PARTS.map((part) => getNativeButton(splitButton, part).disabled),
      ).toEqual([false, false]);
    });

    it('should leave both buttons as tab stops', async () => {
      const splitButton = await create(way);

      expect(await tabStops(splitButton, 2)).toEqual(PARTS);
    });

    it.each([
      ['leading', ['click']],
      ['trailing', ['secondaryaction']],
    ] as const)(
      'should fire the event of a click on the %s button',
      async (part, expected) => {
        const splitButton = await create(way);
        const events = recordEvents(splitButton);
        await clickPart(splitButton, part);

        expect(events).toEqual(expected);
      },
    );

    it.each([
      ['leading', ['click', 'click']],
      ['trailing', ['secondaryaction', 'secondaryaction']],
    ] as const)(
      'should fire the events of two keys on the %s button',
      async (part, expected) => {
        const splitButton = await create(way);
        const events = recordEvents(splitButton);
        await pressKeysOnPart(splitButton, part);

        expect(events).toEqual(expected);
      },
    );

    it.each(PARTS)('should draw the %s button as enabled', async (part) => {
      const splitButton = await create(way);

      expect(await colorsOf(getMember(splitButton, part))).toEqual(
        await expectedColors(part, false),
      );
    });
  });
});
