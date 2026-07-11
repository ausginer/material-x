import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { $ } from 'ydin/utils/DOM.js';

const isBrowser =
  typeof window !== 'undefined' && typeof document !== 'undefined';

if (isBrowser) {
  await import('../../checkbox/checkbox.ts');
  await import('../../radio/radio.ts');
}

const CHECKABLE_TAGS = ['mx-checkbox', 'mx-radio'] as const;

type CheckableTag = (typeof CHECKABLE_TAGS)[number];

function createCheckable(tag: CheckableTag): HTMLElement {
  const checkable = document.createElement(tag);
  document.body.append(checkable);
  return checkable;
}

function getInput(checkable: HTMLElement): HTMLInputElement {
  const input = $<HTMLInputElement>(checkable, '#input');

  if (!input) {
    throw new Error('Missing internal checkable input');
  }

  return input;
}

type EventRecording = Readonly<{
  events: readonly Event[];
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

afterEach(() => {
  if (isBrowser) {
    document.body.replaceChildren();
  }
});

if (isBrowser) {
  describe.each(CHECKABLE_TAGS)('%s activation events', (tag) => {
    it('should expose one activation sequence for internal pointer interaction', async () => {
      const checkable = createCheckable(tag);
      const input = getInput(checkable);
      const { events } = recordEvents(checkable);

      await userEvent.setup().click(input);

      expect(events.map(({ type }) => type)).toEqual([
        'click',
        'input',
        'change',
      ]);
    });

    it('should expose one activation sequence for host click', () => {
      const checkable = createCheckable(tag);
      const input = getInput(checkable);
      const { events, origins } = recordEvents(checkable);

      checkable.click();

      expect(events.map(({ type }) => type)).toEqual([
        'click',
        'input',
        'change',
      ]);
      expect(origins[0]).toBe(input);
    });

    it('should activate the internal input through an external label', () => {
      const checkable = createCheckable(tag);
      const input = getInput(checkable);
      const { events, origins } = recordEvents(checkable);
      const label = document.createElement('label');

      checkable.id = `${tag}-control`;
      label.htmlFor = checkable.id;
      document.body.prepend(label);

      label.click();

      expect(events.map(({ type }) => type)).toEqual([
        'click',
        'input',
        'change',
      ]);
      expect(origins[0]).toBe(input);
    });

    it('should preserve native event interfaces and flags', () => {
      const checkable = createCheckable(tag);
      const { events } = recordEvents(checkable);

      getInput(checkable).click();

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
} else {
  describe('CheckableCore browser tests', () => {
    it.skip('should run in browser mode', () => {});
  });
}
