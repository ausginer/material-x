import { afterEach, describe, expect, it, vi } from 'vitest';
import { commands, server, userEvent } from 'vitest/browser';
import type Slider from '../../src/slider/slider.ts';
import '../../src/slider/slider.ts';
import { nextFrame } from '../browser.ts';
import type { AccessibilityNode } from '../support/accessibility-commands.node.ts';

const TAB = server.browser === 'safari' ? '{Alt>}{Tab}{/Alt}' : '{Tab}';
const isWebKit = server.browser === 'webkit' || server.browser === 'safari';

/** A native thumb of 4px travels 200px, so a unit of 0 to 100 is 2px. */
const WIDTH = 204;

type Attributes = Readonly<Record<string, string>>;

function createSlider(
  attrs: Attributes = {},
  container: HTMLElement = document.body,
): Slider {
  const slider = document.createElement('mx-slider');

  slider.style.inlineSize = `${WIDTH}px`;

  for (const [name, value] of Object.entries(attrs)) {
    slider.setAttribute(name, value);
  }

  container.append(slider);

  return slider;
}

function addLabelContent(slider: Slider, text = 'S'): HTMLElement {
  const content = document.createElement('span');
  content.slot = 'label';
  content.textContent = text;
  slider.append(content);

  return content;
}

function getPart(slider: Slider, selector: string): HTMLElement {
  return slider.shadowRoot!.querySelector<HTMLElement>(selector)!;
}

function getInput(slider: Slider): HTMLInputElement {
  return getPart(slider, '.input') as HTMLInputElement;
}

/** The viewport point of the thumb's centre at `fraction` from the left. */
function pointAt(slider: Slider, fraction: number): readonly [number, number] {
  const { left, top, height } = getInput(slider).getBoundingClientRect();

  return [left + 2 + fraction * (WIDTH - 4), top + height / 2];
}

async function press(slider: Slider, fraction: number): Promise<void> {
  await commands.pointerPress(...pointAt(slider, fraction));
}

async function moveTo(slider: Slider, fraction: number): Promise<void> {
  await commands.pointerMove(...pointAt(slider, fraction), 1);
  // The event of a move is dispatched with the frame.
  await nextFrame();
  await nextFrame();
}

async function release(): Promise<void> {
  await commands.pointerRelease();
  await nextFrame();
}

/**
 * The events that reach the document, as `type value`, with consecutive
 * repeats left out: Firefox repeats `input` at the same value.
 */
function recordEvents(slider: Slider): string[] {
  const log: string[] = [];

  for (const type of ['input', 'change']) {
    slider.ownerDocument.addEventListener(
      type,
      ({ target }) => {
        const entry = `${type} ${slider.value}`;

        if (target === slider && log.at(-1) !== entry) {
          log.push(entry);
        }
      },
      { signal: listeners.signal },
    );
  }

  return log;
}

let listeners = new AbortController();

afterEach(async () => {
  listeners.abort();
  listeners = new AbortController();
  // A row that fails mid-gesture leaves the button down.
  await commands.pointerRelease().catch(() => {});
});

function drawnFraction(slider: Slider): number {
  const track = getPart(slider, '.track').getBoundingClientRect();
  const handle = getPart(slider, '.handle').getBoundingClientRect();

  return (handle.left + handle.width / 2 - track.left - 2) / (WIDTH - 4);
}

describe('mx-slider attributes and properties', () => {
  it.each([
    ['value', 30],
    ['min', -5],
    ['max', 200],
    ['step', 5],
  ] as const)(
    'should read %s from its attribute as a number',
    (name, value) => {
      expect(createSlider({ [name]: String(value) })[name]).toBe(value);
    },
  );

  it.each([
    ['min', '-5'],
    ['max', '200'],
    ['step', '5'],
  ] as const)('should reflect %s and pass it to the input', (name, value) => {
    const slider = createSlider();

    slider[name] = Number(value);

    expect(slider.getAttribute(name)).toBe(value);
    expect(getInput(slider)[name]).toBe(value);
  });

  it.each([
    ['size', 'large'],
    ['valuetext', 'x'],
    ['name', 'n'],
  ] as const)('should reflect %s', (name, value) => {
    const slider = createSlider();

    slider.setAttribute(name, value);

    expect(slider[name]).toBe(value);

    Reflect.set(slider, name, null);

    expect(slider.hasAttribute(name)).toBe(false);
  });

  it.each(['indicator', 'disabled', 'error', 'required'] as const)(
    'should reflect %s as a boolean',
    (name) => {
      const slider = createSlider();

      expect(slider[name]).toBe(false);

      slider[name] = true;

      expect(slider.hasAttribute(name)).toBe(true);
    },
  );

  it('should range from 0 to 100 in steps of 1 by default', () => {
    const slider = createSlider();

    slider.value = 200;
    expect(slider.value).toBe(100);

    slider.value = -1;
    expect(slider.value).toBe(0);

    slider.value = 12.7;
    expect(slider.value).toBe(13);
  });

  it('should start at the midpoint', () => {
    expect(createSlider().value).toBe(50);
  });

  it('should start at 0 on a signed range', () => {
    expect(createSlider({ min: '-55', max: '55' }).value).toBe(0);
  });

  it.each(['any', 'x'])('should read the step %s as absent', (step) => {
    const slider = createSlider({ step });

    slider.value = 12.7;

    expect(slider.step).toBeNull();
    expect(slider.value).toBe(13);
  });

  it('should take the midpoint when value is set to null', () => {
    const slider = createSlider({ value: '30' });

    slider.value = null;

    expect(slider.value).toBe(50);
  });

  it('should draw the handle at 0 when the bounds are equal', () => {
    expect(drawnFraction(createSlider({ min: '5', max: '5' }))).toBe(0);
  });

  it('should never write the value attribute of the input', () => {
    const slider = createSlider({ value: '30' });

    slider.value = 40;

    expect(getInput(slider).hasAttribute('value')).toBe(false);
  });

  it('should not reflect value', () => {
    const slider = createSlider({ value: '30' });

    slider.value = 40;

    expect(slider.getAttribute('value')).toBe('30');
  });

  it('should fire no event when value is set', () => {
    const slider = createSlider();
    const events = recordEvents(slider);

    slider.value = 40;

    expect(events).toEqual([]);
  });

  it('should draw the handle at the value', () => {
    const slider = createSlider();

    slider.value = 25;

    expect(drawnFraction(slider)).toBeCloseTo(0.25, 3);
  });
});

/** Every order of the items. */
function permutations<T>(items: readonly T[]): ReadonlyArray<readonly T[]> {
  return items.length < 2
    ? [items]
    : items.flatMap((item, index) =>
        permutations(items.toSpliced(index, 1)).map((rest) => [item, ...rest]),
      );
}

const ORDERED = {
  value: 210.5,
  min: 100,
  max: 300,
  step: 0.5,
} as const;

describe.each(
  permutations(['value', 'min', 'max', 'step'] as const).map((order) => ({
    order,
    name: order.join(', '),
  })),
)('mx-slider set in the order $name', ({ order }) => {
  it('should give the same value from properties', () => {
    const slider = createSlider();

    for (const name of order) {
      slider[name] = ORDERED[name];
    }

    expect(slider.value).toBe(ORDERED.value);
    expect(drawnFraction(slider)).toBeCloseTo(110.5 / 200, 3);
  });

  it('should give the same value from attributes', () => {
    const slider = createSlider(
      Object.fromEntries(order.map((name) => [name, String(ORDERED[name])])),
    );

    expect(slider.value).toBe(ORDERED.value);
  });
});

describe('mx-slider value ownership', () => {
  it('should follow the value attribute before a move or a script write', () => {
    const slider = createSlider({ value: '30' });

    slider.setAttribute('value', '60');

    expect(slider.value).toBe(60);
  });

  it('should not follow the value attribute after a script write', () => {
    const slider = createSlider({ value: '30' });

    slider.value = 40;
    slider.setAttribute('value', '60');

    expect(slider.value).toBe(40);
  });

  it('should not follow the value attribute after a user move', async () => {
    const slider = createSlider({ value: '30' });

    await press(slider, 0.8);
    await release();
    slider.setAttribute('value', '60');

    expect(slider.value).toBe(80);
  });

  it('should keep the number the user chose through a later bound', async () => {
    const slider = createSlider();

    await press(slider, 0.8);
    await release();
    slider.max = 60;
    expect(slider.value).toBe(60);

    slider.max = 100;
    expect(slider.value).toBe(80);
  });
});

describe('mx-slider pointer', () => {
  it('should fire input and then change on a press on the track', async () => {
    const slider = createSlider();
    const events = recordEvents(slider);

    await press(slider, 0.2);
    await release();

    await vi.waitFor(() => expect(events).toEqual(['input 20', 'change 20']));
  });

  it('should not change the value on a press on the centre of the handle', async () => {
    const slider = createSlider({ value: '20' });
    const events = recordEvents(slider);

    await press(slider, 0.2);
    await release();

    expect(events).toEqual([]);
    expect(slider.value).toBe(20);
  });

  it.each([
    { offset: -1.5, pointed: 39 },
    { offset: 1.5, pointed: 41 },
  ])(
    'should keep the value on a press $offset px off the centre of the handle, except in Firefox',
    async ({ offset, pointed }) => {
      const slider = createSlider({ value: '40' });
      // A thumb of 4px travels 196px.
      slider.style.inlineSize = '200px';
      // Puts the pointer on a whole pixel, to which Firefox rounds it down.
      slider.style.marginInlineStart = '0.15px';
      const events = recordEvents(slider);
      const { left, top, width, height } = getPart(
        slider,
        '.handle',
      ).getBoundingClientRect();

      await commands.pointerPress(left + width / 2 + offset, top + height / 2);
      await release();

      // Firefox's own: a press anywhere on a native thumb moves the value to
      // the pointer.
      const moved = server.browser === 'firefox';

      await vi.waitFor(() =>
        expect(events).toEqual(
          moved ? [`input ${pointed}`, `change ${pointed}`] : [],
        ),
      );
      expect(slider.value).toBe(moved ? pointed : 40);
    },
  );

  it('should take the value under a press on the stop indicator', async () => {
    const slider = createSlider();
    const { left, top, width, height } = getPart(
      slider,
      '.stop',
    ).getBoundingClientRect();

    await commands.pointerPress(left + width / 2, top + height / 2);
    await release();

    expect(slider.value).toBe(98);
  });

  it('should follow a drag and stop at each end', async () => {
    const slider = createSlider();
    // Firefox gets no release outside the viewport.
    slider.style.marginInlineStart = '80px';
    const events = recordEvents(slider);

    await press(slider, 0.3);
    await moveTo(slider, 0.8);
    await moveTo(slider, 1.2);
    await moveTo(slider, -0.2);
    await release();

    await vi.waitFor(() =>
      expect(events).toEqual([
        'input 30',
        'input 80',
        'input 100',
        'input 0',
        'change 0',
      ]),
    );
  });

  it('should draw the handle under the pointer', async () => {
    const slider = createSlider();

    await press(slider, 0.3);
    await moveTo(slider, 0.8);

    expect(drawnFraction(slider)).toBeCloseTo(0.8, 3);
  });

  it.each([
    ['dir', (slider: Slider) => slider.setAttribute('dir', 'rtl')],
    ['CSS', (slider: Slider) => slider.style.setProperty('direction', 'rtl')],
  ])('should mirror a press under RTL from %s', async (_, mirror) => {
    const slider = createSlider();
    mirror(slider);

    await press(slider, 0.2);

    expect(slider.value).toBe(80);
    expect(drawnFraction(slider)).toBeCloseTo(0.2, 3);
  });

  it('should dispatch a plain bubbling input that crosses the host', async () => {
    const slider = createSlider();
    const seen: Event[] = [];
    document.body.addEventListener(
      'input',
      (event) => {
        seen.push(event);
      },
      {
        signal: listeners.signal,
      },
    );

    await press(slider, 0.2);

    expect(seen[0]!.constructor).toBe(Event);
    expect(seen[0]).toMatchObject({
      target: slider,
      bubbles: true,
      composed: true,
      cancelable: false,
    });
  });

  it('should dispatch one plain bubbling change at the host', async () => {
    const slider = createSlider();
    const seen: Array<readonly [Event, EventTarget]> = [];
    document.body.addEventListener(
      'change',
      (event) => {
        seen.push([event, event.composedPath()[0]!]);
      },
      { signal: listeners.signal },
    );

    await press(slider, 0.2);
    await release();
    await vi.waitFor(() => expect(seen).toHaveLength(1));

    const [event, origin] = seen[0]!;

    expect(origin).toBe(slider);
    expect(event.constructor).toBe(Event);
    expect(event).toMatchObject({
      bubbles: true,
      composed: false,
      cancelable: false,
    });
  });

  it('should have the value, the form value and the drawing current in the handler', async () => {
    const form = document.createElement('form');
    document.body.append(form);
    const slider = createSlider({ name: 'n' }, form);
    const seen: unknown[] = [];

    slider.addEventListener('input', () => {
      seen.push(
        slider.value,
        new FormData(form).get('n'),
        Math.round(drawnFraction(slider) * 100),
      );
    });

    await press(slider, 0.2);

    expect(seen.slice(0, 3)).toEqual([20, '20', 20]);
  });

  it('should go on dragging when the handler writes the value', async () => {
    const slider = createSlider();
    const seen: number[] = [];

    slider.addEventListener('input', () => {
      seen.push(slider.value);

      if (slider.value > 60) {
        slider.value = 60;
      }
    });

    await press(slider, 0.3);
    await moveTo(slider, 0.8);
    expect(slider.value).toBe(60);
    expect(drawnFraction(slider)).toBeCloseTo(0.6, 3);

    await moveTo(slider, 0.4);
    expect(slider.value).toBe(40);
    expect(seen).toEqual(expect.arrayContaining([30, 80, 40]));
  });

  it('should fire change when the handler writes the same value back', async () => {
    const slider = createSlider();
    const events = recordEvents(slider);

    slider.addEventListener('input', () => {
      const { value } = slider;
      slider.value = value;
    });

    await press(slider, 0.3);
    await moveTo(slider, 0.8);
    await release();

    await vi.waitFor(() => expect(events.at(-1)).toBe('change 80'));
  });
});

describe.runIf(server.browser === 'chromium')('mx-slider touch', () => {
  function createScrollingSlider(): Slider {
    const slider = createSlider();
    const spacer = document.createElement('div');
    spacer.style.blockSize = '3000px';
    document.body.append(spacer);

    return slider;
  }

  afterEach(() => {
    window.scrollTo(0, 0);
  });

  it('should restore the value when a press becomes a vertical scroll', async () => {
    const slider = createScrollingSlider();
    const events = recordEvents(slider);

    await commands.touchDrag(...pointAt(slider, 0.21), 0, -100);
    await vi.waitFor(() => expect(window.scrollY).toBeGreaterThan(0));
    await vi.waitFor(() => expect(events).toEqual(['input 21', 'input 50']));

    expect(slider.value).toBe(50);
    expect(drawnFraction(slider)).toBeCloseTo(0.5, 3);
  });

  it('should dispatch the restoring input with the native flags', async () => {
    const slider = createScrollingSlider();
    const seen: Event[] = [];
    document.body.addEventListener(
      'input',
      (event) => {
        seen.push(event);
      },
      {
        signal: listeners.signal,
      },
    );

    await commands.touchDrag(...pointAt(slider, 0.21), 0, -100);
    await vi.waitFor(() => expect(seen).toHaveLength(2));

    expect(seen[1]!.constructor).toBe(Event);
    expect(seen[1]).toMatchObject({
      target: slider,
      bubbles: true,
      composed: true,
      cancelable: false,
    });
  });

  it('should keep the value of a horizontal drag', async () => {
    const slider = createScrollingSlider();
    const events = recordEvents(slider);

    await commands.touchDrag(...pointAt(slider, 0.21), 60, 0);
    await vi.waitFor(() => expect(events.at(-1)).toBe('change 51'));

    expect(slider.value).toBe(51);
    expect(window.scrollY).toBe(0);
  });
});

type Key = Readonly<{ key: string; value: number }>;

const COMMON_KEYS: readonly Key[] = [
  { key: 'ArrowUp', value: 51 },
  { key: 'ArrowDown', value: 49 },
  { key: 'PageUp', value: 60 },
  { key: 'PageDown', value: 40 },
  { key: 'Home', value: 0 },
  { key: 'End', value: 100 },
];

describe.each([
  { direction: 'ltr', right: 51 },
  // WebKit's own: its horizontal arrow keys don't mirror.
  { direction: 'rtl', right: isWebKit ? 51 : 49 },
])('mx-slider keyboard in $direction', ({ direction, right }) => {
  it.each([
    ...COMMON_KEYS,
    { key: 'ArrowRight', value: right },
    { key: 'ArrowLeft', value: 100 - right },
  ])('should fire input and then change on $key', async ({ key, value }) => {
    const slider = createSlider({ dir: direction });
    const events = recordEvents(slider);

    slider.focus();
    await userEvent.keyboard(`{${key}}`);

    await vi.waitFor(() =>
      expect(events).toEqual([`input ${value}`, `change ${value}`]),
    );
  });
});

describe('mx-slider keyboard', () => {
  it('should step a fraction without an error of representation', async () => {
    const slider = createSlider({
      min: '0',
      max: '1',
      step: '0.1',
      value: '0',
    });
    const events = recordEvents(slider);

    slider.focus();

    for (let i = 0; i < 7; i += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one key at a time
      await userEvent.keyboard('{ArrowRight}');
    }

    expect(events.filter((entry) => entry.startsWith('input'))).toEqual([
      'input 0.1',
      'input 0.2',
      'input 0.3',
      'input 0.4',
      'input 0.5',
      'input 0.6',
      'input 0.7',
    ]);
  });

  it('should be one tab stop, on its input', async () => {
    const slider = createSlider();

    await userEvent.keyboard(TAB);

    expect(document.activeElement).toBe(slider);
    expect(slider.shadowRoot!.activeElement).toBe(getInput(slider));
  });
});

describe('mx-slider in a form', () => {
  function createForm(
    attrs: Attributes = {},
  ): readonly [HTMLFormElement, Slider] {
    const form = document.createElement('form');
    document.body.append(form);

    return [form, createSlider({ name: 'n', ...attrs }, form)];
  }

  it('should submit its value under its name', () => {
    const [form, slider] = createForm({ value: '30' });

    expect(new FormData(form).get('n')).toBe('30');

    slider.value = 40;

    expect(new FormData(form).get('n')).toBe('40');
  });

  it('should submit the midpoint by default', () => {
    expect(new FormData(createForm()[0]).get('n')).toBe('50');
  });

  it.each([
    ['the value attribute', { value: '30' }, 30],
    ['the midpoint', {}, 50],
  ])('should restore %s on a reset', (_, attrs, expected) => {
    const [form, slider] = createForm(attrs);

    slider.value = 80;
    form.reset();

    expect(slider.value).toBe(expected);
    expect(new FormData(form).get('n')).toBe(String(expected));
    expect(drawnFraction(slider)).toBeCloseTo(expected / 100, 3);
  });

  it('should follow the value attribute again after a reset', () => {
    const [form, slider] = createForm({ value: '30' });

    slider.value = 80;
    form.reset();
    slider.setAttribute('value', '60');

    expect(slider.value).toBe(60);
  });

  it.each([
    [
      'its attribute',
      (slider: Slider, _: HTMLFieldSetElement, on: boolean) => {
        slider.disabled = on;
      },
    ],
    [
      'a fieldset',
      (_: Slider, fieldset: HTMLFieldSetElement, on: boolean) => {
        fieldset.disabled = on;
      },
    ],
  ])('should be disabled by %s', async (_, disable) => {
    const [form, slider] = createForm();
    const fieldset = document.createElement('fieldset');
    form.append(fieldset);
    fieldset.append(slider);
    const events = recordEvents(slider);

    disable(slider, fieldset, true);

    expect(getInput(slider).disabled).toBe(true);
    expect(new FormData(form).has('n')).toBe(false);

    await press(slider, 0.2);
    await release();
    await userEvent.keyboard(TAB);

    expect(events).toEqual([]);
    expect(document.activeElement).not.toBe(slider);

    disable(slider, fieldset, false);

    expect(getInput(slider).disabled).toBe(false);
  });

  it('should stay disabled by a fieldset when its attribute is removed', () => {
    const [form, slider] = createForm({ disabled: '' });
    const fieldset = document.createElement('fieldset');
    fieldset.disabled = true;
    form.append(fieldset);
    fieldset.append(slider);

    slider.disabled = false;

    expect(getInput(slider).disabled).toBe(true);
  });

  it('should be disabled when it is parsed in a disabled fieldset', () => {
    const container = document.createElement('div');
    container.innerHTML =
      '<fieldset disabled><mx-slider></mx-slider></fieldset>';
    document.body.append(container);

    expect(getInput(container.querySelector('mx-slider')!).disabled).toBe(true);
  });

  it('should block submission while its custom validity is set', () => {
    const [form, slider] = createForm();

    slider.setCustomValidity('Too low');
    expect(form.checkValidity()).toBe(false);
    expect(slider.validationMessage).toBe('Too low');

    slider.setCustomValidity('');
    expect(form.checkValidity()).toBe(true);
  });

  it('should announce error and required on the input', () => {
    const slider = createSlider({ error: '', required: '' });

    expect(getInput(slider).getAttribute('aria-invalid')).toBe('true');
    expect(getInput(slider).getAttribute('aria-required')).toBe('true');
    expect(slider.matches(':state(error)')).toBe(true);
  });
});

const SOURCES = ['labelledby', 'slot', 'aria-label', 'label'] as const;

type Source = (typeof SOURCES)[number];

const NAMES: Readonly<Record<Source, string>> = {
  labelledby: 'R',
  slot: 'S',
  'aria-label': 'A',
  label: 'L',
};

const COMBINATIONS = Array.from({ length: 16 }, (_, mask) =>
  // oxlint-disable-next-line no-bitwise
  SOURCES.filter((_source, index) => mask & (1 << index)),
).map((sources) => ({ sources, name: sources.join(' + ') || 'nothing' }));

function addSource(slider: Slider, source: Source): void {
  if (source === 'slot') {
    addLabelContent(slider, NAMES.slot);
  } else if (source === 'aria-label') {
    slider.setAttribute('aria-label', NAMES['aria-label']);
  } else if (source === 'label') {
    const label = document.createElement('label');
    label.htmlFor = 'slider';
    label.textContent = NAMES.label;
    slider.parentElement!.prepend(label);
  } else {
    const reference = document.createElement('span');
    reference.id = 'reference';
    reference.textContent = NAMES.labelledby;
    slider.parentElement!.prepend(reference);
    slider.setAttribute('aria-labelledby', 'reference');
  }
}

function removeSource(slider: Slider, source: Source): void {
  if (source === 'slot') {
    slider.replaceChildren();
  } else if (source === 'label') {
    slider.parentElement!.querySelector('label')!.remove();
  } else {
    slider.removeAttribute(
      source === 'labelledby' ? 'aria-labelledby' : source,
    );
  }
}

/** A slider in `#fixture`, with the sources present before it connects. */
async function createNamedSlider(sources: readonly Source[]): Promise<Slider> {
  const fixture = document.createElement('div');
  fixture.id = 'fixture';
  fixture.role = 'group';
  fixture.ariaLabel = 'Fixture';
  const slider = document.createElement('mx-slider');
  slider.id = 'slider';
  slider.style.inlineSize = `${WIDTH}px`;
  fixture.append(slider);

  for (const source of sources) {
    addSource(slider, source);
  }

  document.body.append(fixture);
  await nextFrame();

  return slider;
}

/** The name that the input's own attributes and references give. */
function inputName(slider: Slider): string {
  const input = getInput(slider);
  const { ariaLabelledByElements } = input;

  if (!ariaLabelledByElements) {
    return input.ariaLabel ?? '';
  }

  return ariaLabelledByElements
    .map((element) =>
      element === getPart(slider, '.label')
        ? [...slider.children].map(({ textContent }) => textContent).join(' ')
        : element.textContent,
    )
    .join(' ');
}

function expectedName(sources: readonly Source[]): string {
  const [first] = sources;

  return first ? NAMES[first] : '';
}

describe('mx-slider name', () => {
  it.each(COMBINATIONS)(
    'should refer to the first source of $name',
    async ({ sources }) => {
      expect(inputName(await createNamedSlider(sources))).toBe(
        expectedName(sources),
      );
    },
  );

  it.each(COMBINATIONS.filter(({ sources }) => sources.length === 2))(
    'should follow $name as each is removed and added at run time',
    async ({ sources: [strong, weak] }) => {
      const slider = await createNamedSlider([weak!]);

      addSource(slider, strong!);
      await nextFrame();
      getInput(slider).focus();
      expect(inputName(slider)).toBe(NAMES[strong!]);

      getInput(slider).blur();
      removeSource(slider, strong!);
      await nextFrame();
      getInput(slider).focus();
      expect(inputName(slider)).toBe(NAMES[weak!]);
    },
  );

  it.each(['labelledby', 'slot', 'aria-label'] as const)(
    'should follow %s at run time without focus',
    async (source) => {
      const slider = await createNamedSlider(['label']);

      addSource(slider, source);
      await nextFrame();
      expect(inputName(slider)).toBe(NAMES[source]);

      removeSource(slider, source);
      await nextFrame();
      expect(inputName(slider)).toBe('L');
    },
  );

  it('should read a label that appears later when it takes focus', async () => {
    const slider = await createNamedSlider([]);

    addSource(slider, 'label');
    getInput(slider).focus();

    expect(inputName(slider)).toBe('L');
  });

  it('should describe the input by the element that the host names', async () => {
    const slider = await createNamedSlider(['slot']);
    const description = document.createElement('span');
    description.id = 'description';
    slider.before(description);

    slider.setAttribute('aria-describedby', 'description');
    await nextFrame();
    expect(getInput(slider).ariaDescribedByElements).toEqual([description]);

    slider.removeAttribute('aria-describedby');
    await nextFrame();
    expect(getInput(slider).hasAttribute('aria-describedby')).toBe(false);
  });

  it.each(['aria-valuenow', 'aria-valuemin', 'aria-valuemax'])(
    'should not mirror %s',
    async (name) => {
      const slider = createSlider({ [name]: '5' });

      expect(getInput(slider).hasAttribute(name)).toBe(false);

      slider.setAttribute(name, '6');
      await nextFrame();
      expect(getInput(slider).hasAttribute(name)).toBe(false);
    },
  );

  it('should give valuetext to the input', () => {
    const slider = createSlider({ valuetext: 'V' });

    expect(getInput(slider).getAttribute('aria-valuetext')).toBe('V');

    slider.valuetext = null;
    expect(getInput(slider).hasAttribute('aria-valuetext')).toBe(false);
  });

  it('should prefer a host aria-valuetext, and restore valuetext without it', async () => {
    const slider = createSlider({ valuetext: 'V', 'aria-valuetext': 'H' });

    slider.valuetext = 'W';
    expect(getInput(slider).getAttribute('aria-valuetext')).toBe('H');

    slider.removeAttribute('aria-valuetext');
    await nextFrame();
    expect(getInput(slider).getAttribute('aria-valuetext')).toBe('W');
  });

  it('should focus its input on a click on the slot content', async () => {
    const slider = createSlider();

    await userEvent.click(addLabelContent(slider, 'Label'));

    expect(document.activeElement).toBe(slider);
    expect(slider.shadowRoot!.activeElement).toBe(getInput(slider));
  });

  it.each([
    [
      'wrapping label',
      (slider: Slider, text: HTMLElement, label: HTMLLabelElement) => {
        label.append(text, slider);
      },
    ],
    [
      'label with for',
      (slider: Slider, text: HTMLElement, label: HTMLLabelElement) => {
        slider.id = 'slider';
        label.htmlFor = 'slider';
        label.append(text);
      },
    ],
  ])('should focus its input on a click on a %s', async (_, place) => {
    const label = document.createElement('label');
    const text = document.createElement('span');
    text.textContent = 'Label';
    document.body.append(label);
    const slider = createSlider();
    place(slider, text, label);

    await userEvent.click(text);

    expect(document.activeElement).toBe(slider);
    expect(slider.shadowRoot!.activeElement).toBe(getInput(slider));
  });
});

describe.runIf(server.browser === 'chromium')(
  "mx-slider in Chromium's accessibility tree",
  () => {
    function collect(
      node: AccessibilityNode,
      role: string,
    ): readonly AccessibilityNode[] {
      return [
        ...(node.role === role ? [node] : []),
        ...node.children.flatMap((child) => collect(child, role)),
      ];
    }

    async function readControl(): Promise<AccessibilityNode> {
      const controls = collect(
        await commands.readAccessibilityTree('#fixture'),
        'slider',
      );

      expect(controls).toHaveLength(1);

      return controls[0]!;
    }

    function readHost(): Promise<AccessibilityNode> {
      return commands.readAccessibilityTree('#slider');
    }

    it.each(COMBINATIONS)(
      'should name the control from $name',
      async ({ sources }) => {
        await createNamedSlider(sources);

        expect((await readControl()).name).toBe(expectedName(sources));
      },
    );

    it.each(
      COMBINATIONS.filter(
        ({ sources }) =>
          !sources.includes('aria-label') && !sources.includes('labelledby'),
      ),
    )('should not expose the host with $name', async ({ sources }) => {
      await createNamedSlider(sources);

      expect((await readHost()).ignored).toBe(true);
    });

    it('should name the control from a wrapping label and not expose the host', async () => {
      const slider = await createNamedSlider([]);
      const label = document.createElement('label');
      label.textContent = 'L';
      slider.before(label);
      label.append(slider);
      await nextFrame();

      expect((await readControl()).name.trim()).toBe('L');
      expect((await readHost()).ignored).toBe(true);
    });

    // The host is a second named node: `repo:RF-94`. Its repair reverses this
    // row.
    it.each(['aria-label', 'labelledby'] as const)(
      'should expose the host as a second named node under %s',
      async (source) => {
        await createNamedSlider([source]);

        expect(await readHost()).toMatchObject({
          ignored: false,
          role: 'generic',
          name: NAMES[source],
        });
      },
    );

    it('should describe the control by a host aria-describedby', async () => {
      const slider = await createNamedSlider(['slot']);
      const description = document.createElement('span');
      description.id = 'description';
      description.textContent = 'D';
      slider.before(description);
      slider.setAttribute('aria-describedby', 'description');
      await nextFrame();

      expect((await readControl()).description).toBe('D');
    });

    it('should report the native value and bounds under a host aria-valuenow', async () => {
      const slider = await createNamedSlider(['slot']);
      slider.min = -55;
      slider.max = 55;
      slider.value = -18;
      slider.setAttribute('aria-valuenow', '5');
      slider.setAttribute('aria-valuemin', '0');
      slider.setAttribute('aria-valuemax', '9');
      await nextFrame();

      const control = await readControl();

      expect(control.value).toBe(-18);
      expect(control.properties).toMatchObject({ valuemin: -55, valuemax: 55 });
    });

    it('should not expose the value indicator', async () => {
      const slider = await createNamedSlider(['slot']);
      slider.indicator = true;
      slider.valuetext = 'Shown';
      await userEvent.keyboard(TAB);

      const tree = await commands.readAccessibilityTree('#fixture');

      expect(JSON.stringify(tree.children)).not.toMatch(/"name":"Shown"/u);
    });
  },
);

describe('mx-slider value indicator', () => {
  function indicatorDisplay(slider: Slider): string {
    return getComputedStyle(getPart(slider, '.handle'), '::after').display;
  }

  it('should not be shown at rest', () => {
    expect(indicatorDisplay(createSlider({ indicator: '' }))).toBe('none');
  });

  it('should be shown while the handle is held', async () => {
    const slider = createSlider({ indicator: '' });

    await press(slider, 0.2);
    expect(indicatorDisplay(slider)).toBe('block');

    await release();
    await vi.waitFor(() => expect(indicatorDisplay(slider)).toBe('none'));
  });

  it('should be shown with keyboard focus', async () => {
    const slider = createSlider({ indicator: '' });

    await userEvent.keyboard(TAB);
    expect(indicatorDisplay(slider)).toBe('block');

    getInput(slider).blur();
    await vi.waitFor(() => expect(indicatorDisplay(slider)).toBe('none'));
  });

  it('should not be shown without the attribute', async () => {
    const slider = createSlider();

    await press(slider, 0.2);

    expect(
      getComputedStyle(getPart(slider, '.handle'), '::after').content,
    ).toBe('none');
  });

  it('should hold the value', async () => {
    const slider = createSlider({ indicator: '' });

    expect(getPart(slider, '.handle').dataset['value']).toBe('50');

    await press(slider, 0.2);

    expect(getPart(slider, '.handle').dataset['value']).toBe('20');
  });

  it('should hold valuetext in place of the value', () => {
    const slider = createSlider({ indicator: '', valuetext: '-18°' });

    expect(getPart(slider, '.handle').dataset['value']).toBe('-18°');
  });

  it('should ignore a host aria-valuetext', () => {
    const slider = createSlider({ indicator: '', 'aria-valuetext': 'H' });

    expect(getPart(slider, '.handle').dataset['value']).toBe('50');
  });

  it('should write no text without the attribute', () => {
    const slider = createSlider({ valuetext: 'V' });

    slider.value = 30;

    expect(getPart(slider, '.handle').dataset['value']).toBeUndefined();

    slider.indicator = true;

    expect(getPart(slider, '.handle').dataset['value']).toBe('V');
  });
});

describe.each(['ltr', 'rtl'])('mx-slider layout in %s', (dir) => {
  it.each(['0', '1', '99', '100'])(
    'should have no scrollable overflow at %s',
    (value) => {
      const container = document.createElement('div');
      container.style.cssText = `overflow: auto; inline-size: ${WIDTH}px`;
      document.body.append(container);
      createSlider(
        { dir, value, indicator: '', valuetext: 'A long text' },
        container,
      );

      expect(container.scrollWidth).toBe(WIDTH);
      expect(container.scrollHeight).toBe(container.clientHeight);
    },
  );
});

describe('mx-slider connection', () => {
  it('should fire each event once after a reconnection and a move', async () => {
    const slider = createSlider();
    const container = document.createElement('div');
    document.body.append(container);

    slider.remove();
    container.append(slider);
    document.body.append(slider);
    await nextFrame();

    const seen: string[] = [];
    slider.addEventListener('input', () => {
      seen.push('input');
    });
    slider.addEventListener('change', () => {
      seen.push('change');
    });
    slider.focus();
    await userEvent.keyboard('{ArrowUp}');

    await vi.waitFor(() => expect(seen).toEqual(['input', 'change']));
  });

  it('should keep its value through a reconnection', () => {
    const slider = createSlider({ value: '30' });

    slider.value = 40;
    slider.remove();
    document.body.append(slider);

    expect(slider.value).toBe(40);
    expect(drawnFraction(slider)).toBeCloseTo(0.4, 3);
  });
});

describe('mx-slider label content', () => {
  it('should inherit no private custom property of the slider', () => {
    const slider = createSlider({ value: '30' });
    const content = addLabelContent(slider);
    const track = getComputedStyle(getPart(slider, '.track'));

    for (const name of ['--_fraction', '--_handle-width', '--_handle-color']) {
      expect(track.getPropertyValue(name)).not.toBe('');
      expect(getComputedStyle(content).getPropertyValue(name)).toBe('');
    }
  });
});

describe.skipIf(server.provider !== 'playwright')(
  'mx-slider under reduced motion',
  () => {
    it('should animate no motion property', async () => {
      await commands.emulateReducedMotion(true);

      try {
        const slider = createSlider({ indicator: '' });
        const started: string[] = [];
        slider.shadowRoot!.addEventListener('transitionrun', (event) => {
          started.push((event as TransitionEvent).propertyName);
        });

        await press(slider, 0.2);
        await moveTo(slider, 0.8);
        await release();
        await nextFrame();

        expect(
          started.filter((name) => name !== 'opacity' && name !== 'display'),
        ).toEqual([]);
      } finally {
        await commands.emulateReducedMotion(false);
      }
    });
  },
);
