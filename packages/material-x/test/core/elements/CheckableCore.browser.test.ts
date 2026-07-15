import { $ } from '@ydinjs/core/utils/DOM.js';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../../src/checkbox/checkbox.ts';
import '../../../src/radio/radio.ts';

/**
 * Shared behavior contract for `CheckableCore`-derived elements. `mx-checkbox`
 * and `mx-radio` both wire the same core (checked/value/name/disabled sync,
 * native activation sequence, custom state, form participation); their own
 * suites cover only their deltas.
 */
const CHECKABLE_TAGS = ['mx-checkbox', 'mx-radio'] as const;

type CheckableTag = (typeof CHECKABLE_TAGS)[number];

type CheckableHost = HTMLElement & {
  checked: boolean;
  disabled: boolean;
  value: string | null;
};

function createCheckable(tag: CheckableTag): CheckableHost {
  const element = document.createElement(tag) as CheckableHost;
  document.body.append(element);
  return element;
}

function getControl(element: HTMLElement): HTMLInputElement {
  const control = $<HTMLInputElement>(element, '#input');

  if (!control) {
    throw new Error('Missing internal control');
  }

  return control;
}

type EventRecording = Readonly<{
  events: readonly Event[];
  /**
   * `composedPath()[0]` per event: the node the event actually originated from,
   * observed from a host listener. Retargeting rewrites `target` to the host,
   * so the composed path is the only way to assert the internal origin.
   */
  origins: readonly EventTarget[];
}>;

function recordEvents(target: HTMLElement): EventRecording {
  const events: Event[] = [];
  const origins: EventTarget[] = [];

  for (const type of ['click', 'input', 'change']) {
    target.addEventListener(type, (event) => {
      events.push(event);
      origins.push(event.composedPath()[0]!);
    });
  }

  return { events, origins };
}

describe.each(CHECKABLE_TAGS)('%s state synchronization', (tag) => {
  it('should synchronize the checked property to the control', () => {
    const element = createCheckable(tag);

    element.checked = true;

    expect(getControl(element).checked).toBe(true);
  });

  it('should synchronize the checked attribute to the control', () => {
    const element = createCheckable(tag);

    element.toggleAttribute('checked', true);

    expect(getControl(element).checked).toBe(true);
  });

  it('should expose checked as a host custom state', () => {
    const element = createCheckable(tag);

    element.toggleAttribute('checked', true);

    expect(element.matches(':state(checked)')).toBe(true);
  });

  it('should clear the checked custom state when unchecked', () => {
    const element = createCheckable(tag);
    element.toggleAttribute('checked', true);

    element.toggleAttribute('checked', false);

    expect(element.matches(':state(checked)')).toBe(false);
  });

  it('should reflect the value attribute to the control', () => {
    const element = createCheckable(tag);

    element.setAttribute('value', 'accepted');

    expect(getControl(element).value).toBe('accepted');
  });

  it('should reflect the name attribute to the control', () => {
    const element = createCheckable(tag);

    element.setAttribute('name', 'agreement');

    expect(getControl(element).name).toBe('agreement');
  });

  it('should reflect the disabled property to the control', () => {
    const element = createCheckable(tag);

    element.disabled = true;

    expect(getControl(element).disabled).toBe(true);
  });

  it('should match the disabled pseudo-class when disabled', () => {
    const element = createCheckable(tag);

    element.toggleAttribute('disabled', true);

    expect(element.matches(':disabled')).toBe(true);
  });
});

describe.each(CHECKABLE_TAGS)('%s activation', (tag) => {
  it('should expose the native activation sequence on control click', () => {
    const element = createCheckable(tag);
    const { events } = recordEvents(element);

    getControl(element).click();

    expect(events.map(({ type }) => type)).toEqual([
      'click',
      'input',
      'change',
    ]);
  });

  it('should expose one activation sequence for real pointer interaction', async () => {
    const element = createCheckable(tag);
    const { events } = recordEvents(element);

    await userEvent.click(getControl(element));

    expect(events.map(({ type }) => type)).toEqual([
      'click',
      'input',
      'change',
    ]);
  });

  it('should expose one activation sequence on host click', () => {
    const element = createCheckable(tag);
    const { events } = recordEvents(element);

    element.click();

    expect(events.map(({ type }) => type)).toEqual([
      'click',
      'input',
      'change',
    ]);
  });

  it('should retarget a host click to the internal control', () => {
    const element = createCheckable(tag);
    const { origins } = recordEvents(element);

    element.click();

    expect(origins[0]).toBe(getControl(element));
  });

  it('should activate the internal control through an external label', () => {
    const element = createCheckable(tag);
    element.id = `${tag}-control`;
    const label = document.createElement('label');
    label.htmlFor = element.id;
    document.body.prepend(label);
    const { events, origins } = recordEvents(element);

    label.click();

    expect(events.map(({ type }) => type)).toEqual([
      'click',
      'input',
      'change',
    ]);
    expect(origins[0]).toBe(getControl(element));
  });

  it('should preserve the native event interfaces', () => {
    const element = createCheckable(tag);
    const { events } = recordEvents(element);

    getControl(element).click();

    expect(events[0]).toBeInstanceOf(PointerEvent);
    expect(events[1]?.constructor).toBe(Event);
    expect(events[2]?.constructor).toBe(Event);
  });

  it('should preserve the native event flags', () => {
    const element = createCheckable(tag);
    const { events } = recordEvents(element);

    getControl(element).click();

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

  it('should reflect the checked control back on interaction', () => {
    const element = createCheckable(tag);

    element.click();

    expect(getControl(element).checked).toBe(true);
  });

  it('should activate with a real Space key press', async () => {
    const element = createCheckable(tag);
    const { events } = recordEvents(element);

    getControl(element).focus();
    await userEvent.keyboard(' ');

    expect(events.map(({ type }) => type)).toEqual([
      'click',
      'input',
      'change',
    ]);
  });

  it('should suppress activation when disabled', () => {
    const element = createCheckable(tag);
    element.disabled = true;
    const { events } = recordEvents(element);

    element.click();

    expect(getControl(element).checked).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('should delegate focus to the native control', () => {
    const element = createCheckable(tag);

    element.focus();

    expect(element.shadowRoot?.activeElement).toBe(getControl(element));
  });
});

describe.each(CHECKABLE_TAGS)('%s form participation', (tag) => {
  it('should contribute its value to the form data when checked', () => {
    const form = document.createElement('form');
    const element = createCheckable(tag);
    element.setAttribute('name', 'choice');
    element.setAttribute('value', 'yes');
    element.toggleAttribute('checked', true);
    form.append(element);
    document.body.append(form);

    expect([...new FormData(form).entries()]).toContainEqual(['choice', 'yes']);
  });

  it('should contribute the default "on" value when checked without a value', () => {
    const form = document.createElement('form');
    const element = createCheckable(tag);
    element.setAttribute('name', 'choice');
    element.toggleAttribute('checked', true);
    form.append(element);
    document.body.append(form);

    expect([...new FormData(form).entries()]).toContainEqual(['choice', 'on']);
  });

  it('should omit its value from the form data when unchecked', () => {
    const form = document.createElement('form');
    const element = createCheckable(tag);
    element.setAttribute('name', 'choice');
    element.setAttribute('value', 'yes');
    form.append(element);
    document.body.append(form);

    expect([...new FormData(form).keys()]).not.toContain('choice');
  });
});
