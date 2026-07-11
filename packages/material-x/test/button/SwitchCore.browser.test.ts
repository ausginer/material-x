import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../src/button/switch-button.ts';
import '../../src/button/switch-icon-button.ts';

const SWITCH_TAGS = ['mx-switch-button', 'mx-switch-icon-button'] as const;

type SwitchTag = (typeof SWITCH_TAGS)[number];

function createSwitch(tag: SwitchTag): HTMLElement {
  const element = document.createElement(tag);
  document.body.append(element);
  return element;
}

function getControl(element: HTMLElement): HTMLInputElement {
  const control =
    element.shadowRoot?.querySelector<HTMLInputElement>('.control');

  if (!control) {
    throw new Error('Missing internal switch control');
  }

  return control;
}

function recordEvents(target: HTMLElement): readonly Event[] {
  const events: Event[] = [];

  for (const type of ['click', 'input', 'change']) {
    target.addEventListener(type, (event) => {
      events.push(event);
    });
  }

  return events;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe.each(SWITCH_TAGS)('%s activation events', (tag) => {
  it('should expose the native checkbox activation sequence', () => {
    const element = createSwitch(tag);
    const events = recordEvents(element);

    getControl(element).click();

    expect(events.map(({ type }) => type)).toEqual([
      'click',
      'input',
      'change',
    ]);
  });

  it('should expose one activation sequence for host click', () => {
    const element = createSwitch(tag);
    const events = recordEvents(element);

    element.click();

    expect(events.map(({ type }) => type)).toEqual([
      'click',
      'input',
      'change',
    ]);
  });

  it('should activate with a real Space key press', async () => {
    const element = createSwitch(tag);
    const events = recordEvents(element);

    getControl(element).focus();
    await userEvent.keyboard(' ');

    expect(events.map(({ type }) => type)).toEqual([
      'click',
      'input',
      'change',
    ]);
  });

  it('should preserve native event interfaces and flags', () => {
    const element = createSwitch(tag);
    const events = recordEvents(element);

    getControl(element).click();

    expect(events).toHaveLength(3);
    expect(events[0]).toBeInstanceOf(PointerEvent);
    expect(events[1]?.constructor).toBe(Event);
    expect(events[2]?.constructor).toBe(Event);
    expect(
      events.map(({ bubbles, cancelable, composed }) => ({
        bubbles,
        cancelable,
        composed,
      })),
    ).toEqual([
      { bubbles: true, cancelable: true, composed: true },
      { bubbles: true, cancelable: false, composed: true },
      { bubbles: true, cancelable: false, composed: false },
    ]);
  });
});

describe.each(SWITCH_TAGS)('%s semantics', (tag) => {
  it('should expose switch role on the native control', () => {
    expect(getControl(createSwitch(tag)).role).toBe('switch');
  });

  it('should synchronize the checked property to the control', () => {
    const element = createSwitch(tag) as HTMLElement & { checked: boolean };

    element.checked = true;

    expect(getControl(element).checked).toBe(true);
  });

  it('should synchronize the checked attribute to the control', () => {
    const element = createSwitch(tag);

    element.toggleAttribute('checked', true);

    expect(getControl(element).checked).toBe(true);
  });

  it('should reflect the checked control back on interaction', () => {
    const element = createSwitch(tag) as HTMLElement & { checked: boolean };

    element.click();

    expect(getControl(element).checked).toBe(true);
  });

  it('should suppress activation when disabled', () => {
    const element = createSwitch(tag) as HTMLElement & { disabled: boolean };
    element.disabled = true;
    const events = recordEvents(element);

    element.click();

    expect(getControl(element).checked).toBe(false);
    expect(events).toHaveLength(0);
  });
});

describe('mx-switch-button value', () => {
  it('should reflect the value attribute to the control', () => {
    const element = createSwitch('mx-switch-button');

    element.setAttribute('value', 'on');

    expect(getControl(element).value).toBe('on');
  });

  // Known gap: switches are `formAssociated` but never call
  // `internals.setFormValue`, so a checked switch contributes nothing to the
  // outer form. Pinned until form participation is wired.
  it.fails('should contribute its value to the form data when checked', () => {
    const form = document.createElement('form');
    const element = createSwitch('mx-switch-button');
    element.setAttribute('name', 'toggle');
    element.setAttribute('value', 'on');
    element.toggleAttribute('checked', true);
    form.append(element);
    document.body.append(form);

    expect([...new FormData(form).entries()]).toContainEqual(['toggle', 'on']);
  });
});
