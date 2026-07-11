import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import './switch-button.ts';
import './switch-icon-button.ts';

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

  it('should activate with the Space key', async () => {
    const element = createSwitch(tag);
    const events = recordEvents(element);

    getControl(element).focus();
    await userEvent.setup().keyboard(' ');

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
