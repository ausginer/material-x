import { $ } from '@ydinjs/core/utils/DOM.js';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../src/button-group/button-group.ts';
import '../../src/button-group/connected-button-group.ts';
import '../../src/button/button.ts';
import '../../src/button/switch-button.ts';
import { nextFrame } from '../browser.ts';

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
  const button = $<HTMLButtonElement>(element as HTMLElement, '.host');

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
  it('should forward the size to child buttons as a custom state', () => {
    const group = createStandard();
    group.setAttribute('size', 'large');

    expect(group.children[0]!.matches(':state(large)')).toBe(true);
  });

  it('should forward the color to child buttons as a custom state', () => {
    const group = createStandard();
    group.setAttribute('color', 'elevated');

    expect(group.children[0]!.matches(':state(elevated)')).toBe(true);
  });

  it('should forward the shape to child buttons as a custom state', () => {
    const group = createStandard();
    group.setAttribute('shape', 'square');

    expect(group.children[0]!.matches(':state(square)')).toBe(true);
  });

  it('should forward disabled to the native child buttons', () => {
    const group = createStandard();
    group.toggleAttribute('disabled', true);

    expect(getNativeButton(group.children[0]!).disabled).toBe(true);
  });

  it('should re-enable child buttons when the group clears disabled', () => {
    const group = createStandard();
    group.toggleAttribute('disabled', true);

    group.toggleAttribute('disabled', false);

    expect(getNativeButton(group.children[0]!).disabled).toBe(false);
  });

  it('should forward the current context to a late-added child button', () => {
    const group = createStandard(0);
    group.setAttribute('size', 'large');

    const button = document.createElement('mx-button');
    group.append(button);

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

describe('mx-connected-button-group selection', () => {
  it('should check the child whose value matches the group value', () => {
    const group = createConnected(['one', 'two', 'three']);

    group.setAttribute('value', 'two');

    expect(group.children[1]!.matches(':state(checked)')).toBe(true);
  });
});
