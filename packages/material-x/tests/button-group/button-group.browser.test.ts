import { describe, expect, it, onTestFinished } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../src/button-group/button-group.ts';
import '../../src/button-group/connected-button-group.ts';
import '../../src/button/button.ts';
import '../../src/button/switch-button.ts';
import { contextResolved, nextFrame } from '../browser.ts';
import { focusFirst } from '../focus-indicator.ts';

const SIZE_STATE_CASES = [
  { attribute: 'xsmall' },
  { attribute: 'medium' },
  { attribute: 'large' },
  { attribute: 'xlarge' },
] as const;

const LEADING_PROP = '--_interaction-direction-leading';
const TRAILING_PROP = '--_interaction-direction-trailing';

function createStandard(count = 3): HTMLElement {
  const group = document.createElement('mx-button-group');

  for (let index = 0; index < count; index++) {
    const button = document.createElement('mx-button');
    button.textContent = `Button ${index}`;
    group.append(button);
  }

  document.body.append(group);
  return group;
}

function createConnected(values: readonly string[]): HTMLElement {
  const group = document.createElement('mx-connected-button-group');

  for (const value of values) {
    const button = document.createElement('mx-switch-button');
    button.setAttribute('value', value);
    button.textContent = value;
    group.append(button);
  }

  document.body.append(group);
  return group;
}

function getNativeButton(element: Element): HTMLButtonElement {
  const button = (
    element as HTMLElement
  ).shadowRoot!.querySelector<HTMLButtonElement>('.host');

  if (!button) {
    throw new Error('Missing internal native button');
  }

  return button;
}

describe('mx-button-group host size state', () => {
  it.each(SIZE_STATE_CASES)(
    'should expose $attribute as a host custom state',
    ({ attribute }) => {
      const group = createStandard();
      group.setAttribute('size', attribute);

      expect(group.matches(`:state(${attribute})`)).toBe(true);
    },
  );

  it('should expose no size custom state at the default size', () => {
    const group = createStandard();

    for (const { attribute } of SIZE_STATE_CASES) {
      expect(group.matches(`:state(${attribute})`)).toBe(false);
    }
  });

  it('should switch the host custom state when the size changes', () => {
    const group = createStandard();
    group.setAttribute('size', 'large');

    group.setAttribute('size', 'medium');

    expect(group.matches(':state(large)')).toBe(false);
    expect(group.matches(':state(medium)')).toBe(true);
  });
});

describe('mx-button-group context forwarding', () => {
  it('should forward the size to child buttons as a custom state', async () => {
    const group = createStandard();
    await contextResolved();
    group.setAttribute('size', 'large');

    expect(group.children[0]!.matches(':state(large)')).toBe(true);
  });

  it('should forward the color to child buttons as a custom state', async () => {
    const group = createStandard();
    await contextResolved();
    group.setAttribute('color', 'elevated');

    expect(group.children[0]!.matches(':state(elevated)')).toBe(true);
  });

  it('should forward the shape to child buttons as a custom state', async () => {
    const group = createStandard();
    await contextResolved();
    group.setAttribute('shape', 'square');

    expect(group.children[0]!.matches(':state(square)')).toBe(true);
  });

  it('should forward disabled to the native child buttons', async () => {
    const group = createStandard();
    await contextResolved();
    group.toggleAttribute('disabled', true);

    expect(getNativeButton(group.children[0]!).disabled).toBe(true);
  });

  it('should re-enable child buttons when the group clears disabled', async () => {
    const group = createStandard();
    group.toggleAttribute('disabled', true);
    await contextResolved();

    group.toggleAttribute('disabled', false);

    expect(getNativeButton(group.children[0]!).disabled).toBe(false);
  });

  it('should forward the current context to a late-added child button', async () => {
    const group = createStandard(0);
    group.setAttribute('size', 'large');

    const button = document.createElement('mx-button');
    group.append(button);
    await contextResolved();

    expect(button.matches(':state(large)')).toBe(true);
  });
});

describe('mx-button-group press interaction', () => {
  it('should shrink the neighbours of the pressed button', async () => {
    const group = createStandard();
    await nextFrame();
    const [first, middle, last] = [...group.children] as HTMLElement[];

    middle!.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true }),
    );

    expect(first!.style.getPropertyValue(LEADING_PROP)).toBe('-1');
    expect(last!.style.getPropertyValue(TRAILING_PROP)).toBe('-1');
  });

  it('should restore the neighbours on pointer release', async () => {
    const group = createStandard();
    await nextFrame();
    const [first, middle, last] = [...group.children] as HTMLElement[];

    middle!.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true }),
    );
    group.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(first!.style.getPropertyValue(LEADING_PROP)).toBe('');
    expect(last!.style.getPropertyValue(TRAILING_PROP)).toBe('');
  });
});

// Line breaks, indentation and a comment between the buttons: the slot
// assigns each of them to the group as a node of its own.
const SEPARATED_BUTTONS = `
  <mx-button>One</mx-button>
  <!-- separator -->
  <mx-button>Two</mx-button>
  <mx-button>Three</mx-button>
`;

function collectErrors(): readonly unknown[] {
  const errors: unknown[] = [];
  const controller = new AbortController();
  window.addEventListener(
    'error',
    (event) => {
      errors.push(event.error);
    },
    {
      signal: controller.signal,
    },
  );
  onTestFinished(() => controller.abort());
  return errors;
}

describe('mx-button-group with whitespace between its buttons', () => {
  it('should shrink the neighbours of the pressed button', async () => {
    document.body.innerHTML = `<mx-button-group>${SEPARATED_BUTTONS}</mx-button-group>`;
    await nextFrame();
    const [first, middle, last] = [
      ...document.querySelectorAll<HTMLElement>('mx-button'),
    ];

    middle!.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true }),
    );

    expect([
      first!.style.getPropertyValue(LEADING_PROP),
      last!.style.getPropertyValue(TRAILING_PROP),
    ]).toEqual(['-1', '-1']);
  });

  it('should press and release without an error', async () => {
    document.body.innerHTML = `<mx-button-group>${SEPARATED_BUTTONS}</mx-button-group>`;
    await nextFrame();
    const group = document.querySelector('mx-button-group')!;
    const middle = group.querySelectorAll('mx-button')[1]!;
    const errors = collectErrors();

    middle.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true }),
    );
    group.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    group.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));

    expect(errors).toEqual([]);
  });
});

describe('mx-connected-button-group with whitespace between its buttons', () => {
  it('should mark the first and last buttons', async () => {
    document.body.innerHTML = `<mx-connected-button-group>${SEPARATED_BUTTONS}</mx-connected-button-group>`;
    await nextFrame();
    const buttons = [...document.querySelectorAll<HTMLElement>('mx-button')];

    expect(
      buttons.map((button) => [
        button.dataset['first'],
        button.dataset['last'],
      ]),
    ).toEqual([
      ['', undefined],
      [undefined, undefined],
      [undefined, ''],
    ]);
  });

  it('should take a slot change without an error', async () => {
    document.body.innerHTML = `<mx-connected-button-group>${SEPARATED_BUTTONS}</mx-connected-button-group>`;
    await nextFrame();
    const errors = collectErrors();

    document
      .querySelector('mx-connected-button-group')!
      .append('\n  ', document.createElement('mx-button'), '\n');
    await nextFrame();

    expect(errors).toEqual([]);
  });
});

describe('mx-connected-button-group slot bookkeeping', () => {
  it('should mark the first and last children', async () => {
    const group = createConnected(['one', 'two', 'three']);
    await nextFrame();
    const [first, middle, last] = [...group.children] as HTMLElement[];

    expect(first!.dataset['first']).toBe('');
    expect(last!.dataset['last']).toBe('');
    expect(middle!.dataset['first']).toBeUndefined();
    expect(middle!.dataset['last']).toBeUndefined();
  });

  it('should re-mark the edges when the children change', async () => {
    const group = createConnected(['one', 'two']);
    await nextFrame();
    const originalFirst = group.children[0] as HTMLElement;

    const prepended = document.createElement('mx-switch-button');
    prepended.setAttribute('value', 'zero');
    group.prepend(prepended);
    await nextFrame();

    expect(prepended.dataset['first']).toBe('');
    expect(originalFirst.dataset['first']).toBeUndefined();
  });
});

describe('mx-connected-button-group with buttons cloned from a template', () => {
  async function createFromTemplate(): Promise<HTMLElement> {
    const template = document.createElement('template');
    template.innerHTML = ['a', 'b', 'c']
      .map(
        (value) =>
          `<mx-switch-button value="${value}">${value}</mx-switch-button>`,
      )
      .join('');
    const group = document.createElement('mx-connected-button-group');
    group.append(template.content.cloneNode(true));
    await nextFrame();
    document.body.append(group);
    await nextFrame();

    return group;
  }

  it('should have one tab stop', async () => {
    const group = await createFromTemplate();

    expect(
      Array.from(group.children, (item) => item.getAttribute('tabindex')),
    ).toEqual(['0', '-1', '-1']);
  });

  it('should move focus with an arrow key', async () => {
    const group = await createFromTemplate();

    (group.firstElementChild as HTMLElement).focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(document.activeElement).toBe(group.children[1]);
  });
});

describe('mx-connected-button-group roving tabindex', () => {
  it('should make only the first enabled item tabbable', async () => {
    const group = createConnected(['one', 'two', 'three']);
    await nextFrame();
    const [first, second, third] = [...group.children] as HTMLElement[];

    expect(first!.tabIndex).toBe(0);
    expect(second!.tabIndex).toBe(-1);
    expect(third!.tabIndex).toBe(-1);
  });

  it('should move the tab stop to the next item on ArrowRight', async () => {
    const group = createConnected(['one', 'two', 'three']);
    await nextFrame();
    const [first, second] = [...group.children] as HTMLElement[];

    first!.focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(second!.tabIndex).toBe(0);
    expect(first!.tabIndex).toBe(-1);
  });

  it('should move the tab stop to the last item on End', async () => {
    const group = createConnected(['one', 'two', 'three']);
    await nextFrame();
    const [first, , third] = [...group.children] as HTMLElement[];

    first!.focus();
    await userEvent.keyboard('{End}');

    expect(third!.tabIndex).toBe(0);
  });
});

describe('mx-connected-button-group with members that cannot take focus', () => {
  /** The member that Tab reaches. */
  async function tabInto(group: HTMLElement): Promise<Element | null> {
    await focusFirst(group);

    return document.activeElement;
  }

  it.each(['hidden', 'disabled'] as const)(
    'should be entered at the second member when the first is %s',
    async (attribute) => {
      const group = createConnected(['one', 'two', 'three']);
      await nextFrame();

      (group.children[0] as HTMLElement).toggleAttribute(attribute, true);
      await nextFrame();

      expect(await tabInto(group)).toBe(group.children[1]);
    },
  );

  it('should move past a hidden member with an arrow key', async () => {
    const group = createConnected(['one', 'two', 'three']);
    await nextFrame();
    const [first, second, third] = [...group.children] as HTMLElement[];
    second!.hidden = true;
    await nextFrame();

    first!.focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(document.activeElement).toBe(third);
  });
});

describe('mx-connected-button-group selection', () => {
  it('should check the child whose value matches the group value', async () => {
    const group = createConnected(['one', 'two', 'three']);
    await contextResolved();

    group.setAttribute('value', 'two');

    expect(group.children[1]!.matches(':state(checked)')).toBe(true);
  });
});
