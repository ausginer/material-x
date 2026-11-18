import { $ } from '@ydinjs/core/utils/DOM.js';
import { describe, expect, it } from 'vitest';
import { server, userEvent } from 'vitest/browser';
import '../../src/button-group/connected-button-group.ts';
import '../../src/button/switch-button.ts';
import '../../src/button/switch-icon-button.ts';
import { nextFrame } from '../browser.ts';

const SWITCH_TAGS = ['mx-switch-button', 'mx-switch-icon-button'] as const;

type SwitchTag = (typeof SWITCH_TAGS)[number];

type SwitchElement = HTMLElement & {
  checked: boolean;
  disabled: boolean;
  value: string | null;
};

/**
 * The key that moves focus to every control. Safari's default Tab skips
 * buttons, and Option-Tab reaches them (`repo:RF-42`).
 */
const TAB = server.browser === 'safari' ? '{Alt>}{Tab}{/Alt}' : '{Tab}';

function createSwitch(tag: SwitchTag): SwitchElement {
  const element = document.createElement(tag) as SwitchElement;
  document.body.append(element);
  return element;
}

function getHost(element: HTMLElement): HTMLButtonElement {
  const host = $<HTMLButtonElement>(element, '.host');

  if (!host) {
    throw new Error('Missing internal switch button');
  }

  return host;
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

function types(events: readonly Event[]): readonly string[] {
  return events.map(({ type }) => type);
}

function createForm(element: SwitchElement): HTMLFormElement {
  const form = document.createElement('form');
  element.setAttribute('name', 'toggle');
  form.append(element);
  document.body.append(form);
  return form;
}

/** The four observations that follow `checked` under the controlled model. */
function observeChecked(element: SwitchElement, form: HTMLFormElement) {
  return {
    checked: element.checked,
    ariaChecked: getHost(element).ariaChecked,
    state: element.matches(':state(checked)'),
    formValue: new FormData(form).get('toggle'),
  };
}

describe.each(SWITCH_TAGS)('%s activation events', (tag) => {
  it('should dispatch click, input and change for a pointer click', async () => {
    const element = createSwitch(tag);
    const events = recordEvents(element);

    await userEvent.click(getHost(element));

    expect(types(events)).toEqual(['click', 'input', 'change']);
  });

  it('should dispatch one activation sequence for host click', () => {
    const element = createSwitch(tag);
    const events = recordEvents(element);

    element.click();

    expect(types(events)).toEqual(['click', 'input', 'change']);
  });

  it('should activate with a real Space key press', async () => {
    const element = createSwitch(tag);
    const events = recordEvents(element);

    element.focus();
    await userEvent.keyboard(' ');

    expect(types(events)).toEqual(['click', 'input', 'change']);
  });

  it('should activate with a real Enter key press', async () => {
    const element = createSwitch(tag);
    const events = recordEvents(element);

    element.focus();
    await userEvent.keyboard('{Enter}');

    expect(types(events)).toEqual(['click', 'input', 'change']);
  });

  it('should activate through a label that names the host', () => {
    const element = createSwitch(tag);
    element.id = 'switch';
    const label = document.createElement('label');
    label.htmlFor = element.id;
    label.textContent = 'Label';
    document.body.prepend(label);
    const events = recordEvents(element);

    label.click();

    expect(types(events)).toEqual(['click', 'input', 'change']);
  });

  it('should dispatch input and change after every click listener', () => {
    const element = createSwitch(tag);
    const events: string[] = [];
    const controller = new AbortController();
    for (const type of ['click', 'input', 'change']) {
      document.addEventListener(
        type,
        ({ type: name }) => {
          events.push(name);
        },
        { signal: controller.signal },
      );
    }

    element.click();
    controller.abort();

    expect(events).toEqual(['click', 'input', 'change']);
  });

  it('should dispatch no input or change for a cancelled click', () => {
    const element = createSwitch(tag);
    const events = recordEvents(element);
    element.addEventListener('click', (event) => event.preventDefault());

    element.click();

    expect(types(events)).toEqual(['click']);
  });

  it('should preserve native event interfaces and flags', () => {
    const element = createSwitch(tag);
    const events = recordEvents(element);

    getHost(element).click();

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

describe.each(SWITCH_TAGS)('%s disabled', (tag) => {
  it('should suppress activation when disabled', () => {
    const element = createSwitch(tag);
    element.disabled = true;
    const events = recordEvents(element);

    element.click();

    expect(events).toHaveLength(0);
  });

  it('should be skipped by Tab when disabled', async () => {
    const element = createSwitch(tag);
    element.disabled = true;
    const after = document.createElement('button');
    document.body.append(after);

    await userEvent.keyboard(TAB);

    expect(document.activeElement).toBe(after);
  });
});

describe.each(SWITCH_TAGS)('%s semantics', (tag) => {
  it('should expose the switch role on the internal button', () => {
    expect(getHost(createSwitch(tag)).role).toBe('switch');
  });

  it('should expose aria-checked false on a new switch', () => {
    expect(getHost(createSwitch(tag)).ariaChecked).toBe('false');
  });

  it('should synchronize the checked property to aria-checked', () => {
    const element = createSwitch(tag);

    element.checked = true;

    expect(getHost(element).ariaChecked).toBe('true');
  });

  it('should synchronize the checked attribute to aria-checked', () => {
    const element = createSwitch(tag);
    element.toggleAttribute('checked', true);

    element.toggleAttribute('checked', false);

    expect(getHost(element).ariaChecked).toBe('false');
  });

  it('should leave every checked observation unchanged by activation without a handler', () => {
    const element = createSwitch(tag);
    const form = createForm(element);
    const before = observeChecked(element, form);

    element.click();

    expect(observeChecked(element, form)).toStrictEqual(before);
  });

  it('should follow a change handler that sets checked', () => {
    const element = createSwitch(tag);
    const form = createForm(element);
    element.addEventListener('change', () => {
      element.checked = !element.checked;
    });

    element.click();

    expect(observeChecked(element, form)).toStrictEqual({
      checked: true,
      ariaChecked: 'true',
      state: true,
      formValue: 'on',
    });
  });
});

describe('mx-switch-button accessible name', () => {
  it('should take its accessible name from its label content', async () => {
    const element = createSwitch('mx-switch-button');
    element.textContent = 'Enabled';

    await expect.element(getHost(element)).toHaveAccessibleName('Enabled');
  });
});

describe('mx-switch-button value', () => {
  it('should contribute its value to the form data when checked', () => {
    const element = createSwitch('mx-switch-button');
    element.setAttribute('value', 'yes');
    element.toggleAttribute('checked', true);
    const form = createForm(element);

    expect([...new FormData(form).entries()]).toContainEqual(['toggle', 'yes']);
  });

  it('should contribute on when checked without a value', () => {
    const element = createSwitch('mx-switch-button');
    element.toggleAttribute('checked', true);
    const form = createForm(element);

    expect([...new FormData(form).entries()]).toContainEqual(['toggle', 'on']);
  });

  it('should omit its value from the form data when unchecked', () => {
    const element = createSwitch('mx-switch-button');
    element.setAttribute('value', 'yes');
    const form = createForm(element);

    expect([...new FormData(form).keys()]).not.toContain('toggle');
  });
});

describe('mx-switch-button in a connected button group', () => {
  function createGroup(): readonly [HTMLElement, readonly SwitchElement[]] {
    const group = document.createElement('mx-connected-button-group');
    const switches = ['one', 'two'].map((value) => {
      const element = document.createElement(
        'mx-switch-button',
      ) as SwitchElement;
      element.setAttribute('value', value);
      element.setAttribute('name', value);
      element.textContent = value;
      return element;
    });
    group.append(...switches);
    const form = document.createElement('form');
    form.append(group);
    document.body.append(form);
    return [group, switches];
  }

  function observeAll(switches: readonly SwitchElement[]) {
    return switches.map((element) => ({
      checked: element.checked,
      ariaChecked: getHost(element).ariaChecked,
      state: element.matches(':state(checked)'),
      formValue: new FormData(element.closest('form')!).get(element.value!),
    }));
  }

  it('should check the switch whose value matches the group value', () => {
    const [group, switches] = createGroup();

    group.setAttribute('value', 'two');

    expect(observeAll(switches)).toStrictEqual([
      { checked: false, ariaChecked: 'false', state: false, formValue: null },
      { checked: true, ariaChecked: 'true', state: true, formValue: 'two' },
    ]);
  });

  it('should uncheck the previous switch when the group value changes', () => {
    const [group, switches] = createGroup();
    group.setAttribute('value', 'two');

    group.setAttribute('value', 'one');

    expect(observeAll(switches)).toStrictEqual([
      { checked: true, ariaChecked: 'true', state: true, formValue: 'one' },
      { checked: false, ariaChecked: 'false', state: false, formValue: null },
    ]);
  });

  it('should move roving focus to the internal button', async () => {
    const [, switches] = createGroup();
    await nextFrame();

    switches[0]!.focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(document.activeElement).toBe(switches[1]);
    expect(switches[1]!.shadowRoot?.activeElement).toBe(getHost(switches[1]!));
  });
});

describe.each(SWITCH_TAGS)('%s focus', (tag) => {
  it('should focus the internal button on focus()', () => {
    const element = createSwitch(tag);

    element.focus();

    expect(element.shadowRoot?.activeElement).toBe(getHost(element));
  });

  it('should reach the internal button by Tab', async () => {
    const element = createSwitch(tag);

    await userEvent.keyboard(TAB);

    expect(document.activeElement).toBe(element);
    expect(element.shadowRoot?.activeElement).toBe(getHost(element));
  });
});
