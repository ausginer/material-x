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
 * repeats of `input` left out: Firefox repeats it at the same value.
 */
function recordEvents(slider: Slider): string[] {
  const log: string[] = [];

  for (const type of ['input', 'change']) {
    slider.ownerDocument.addEventListener(
      type,
      ({ target }) => {
        const entry = `${type} ${slider.value}`;

        if (target === slider && (type === 'change' || log.at(-1) !== entry)) {
          log.push(entry);
        }
      },
      { signal: listeners.signal },
    );
  }

  return log;
}

type HeldLook = Readonly<{ handle: string; indicator: string }>;

const HELD: HeldLook = { handle: '2px', indicator: 'flex' };
const RESTING: HeldLook = { handle: '4px', indicator: 'none' };

function readLook(slider: Slider): HeldLook {
  return {
    handle: getComputedStyle(getPart(slider, '.handle')).width,
    indicator: getComputedStyle(getPart(slider, '.indicator')).display,
  };
}

/** The indicator keeps its box until its fade ends. */
async function expectResting(slider: Slider): Promise<void> {
  await vi.waitFor(() => expect(readLook(slider)).toEqual(RESTING));
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

  describe('with equal bounds', () => {
    function boxes(slider: Slider): readonly unknown[] {
      return [
        drawnFraction(slider),
        getComputedStyle(getPart(slider, '.track'), '::before').width,
        getPart(slider, '.stop').getBoundingClientRect().width,
      ];
    }

    it('should be drawn as at 0', () => {
      const equal = createSlider({ min: '5', max: '5' });
      const zero = createSlider({ value: '0' });

      expect(boxes(equal)).toEqual(boxes(zero));
      expect(drawnFraction(equal)).toBe(0);
    });
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

describe('mx-slider touch action', () => {
  it('should leave vertical panning to the browser', () => {
    expect(getComputedStyle(getInput(createSlider())).touchAction).toBe(
      'pan-y',
    );
  });
});

describe.runIf(server.browser === 'chromium')('mx-slider touch', () => {
  type Offset = readonly [dx: number, dy: number];

  const TOUCH_STEPS = 10;

  function createScrollingSlider(attrs: Attributes = {}): Slider {
    const form = document.createElement('form');
    const spacer = document.createElement('div');
    spacer.style.blockSize = '3000px';
    document.body.append(form, spacer);

    return createSlider({ name: 'n', ...attrs }, form);
  }

  async function settle(): Promise<void> {
    await nextFrame();
    await nextFrame();
  }

  async function touchAt(slider: Slider, fraction: number): Promise<void> {
    await commands.touch('touchStart', pointAt(slider, fraction));
    await settle();
  }

  /** Moves the finger along the offsets from its first point. */
  async function slide(
    [x, y]: readonly [number, number],
    ...offsets: readonly Offset[]
  ): Promise<void> {
    let [fromX, fromY] = [0, 0];

    for (const [dx, dy] of offsets) {
      for (let i = 1; i <= TOUCH_STEPS; i += 1) {
        // oxlint-disable-next-line no-await-in-loop -- one move at a time
        await commands.touch('touchMove', [
          x + fromX + ((dx - fromX) * i) / TOUCH_STEPS,
          y + fromY + ((dy - fromY) * i) / TOUCH_STEPS,
        ]);
        // oxlint-disable-next-line no-await-in-loop -- one move at a time
        await nextFrame();
      }

      [fromX, fromY] = [dx, dy];
    }
  }

  async function lift(): Promise<void> {
    await commands.touch('touchEnd');
    await settle();
  }

  /** A press on the slider that the browser takes for a scroll. */
  async function pan(
    slider: Slider,
    fraction: number,
    during?: () => void,
  ): Promise<void> {
    const point = pointAt(slider, fraction);

    await touchAt(slider, fraction);
    during?.();
    await slide(point, [0, -100]);
    await vi.waitFor(() => expect(window.scrollY).toBeGreaterThan(0));
    await lift();
  }

  function read(slider: Slider): readonly unknown[] {
    return [
      slider.value,
      new FormData(slider.form!).get('n'),
      Math.round(drawnFraction(slider) * 100),
    ];
  }

  afterEach(async () => {
    // A row that fails mid-gesture leaves the finger down.
    await commands.touch('touchCancel').catch(() => {});
    window.scrollTo(0, 0);
  });

  it.each([
    ['the track', 0.21],
    ['the handle', 0.5],
  ])(
    'should do nothing on a vertical scroll that starts on %s',
    async (_, fraction) => {
      const slider = createScrollingSlider();
      const events = recordEvents(slider);
      const before = [50, '50', 50];
      const point = pointAt(slider, fraction);

      await touchAt(slider, fraction);
      expect(read(slider)).toEqual(before);

      await slide(point, [0, -100]);
      await vi.waitFor(() => expect(window.scrollY).toBeGreaterThan(0));
      expect(read(slider)).toEqual(before);

      await lift();
      expect(read(slider)).toEqual(before);
      expect(getInput(slider).value).toBe('50');
      expect(events).toEqual([]);
    },
  );

  it('should not write the pressed number to the value indicator before a scroll', async () => {
    const slider = createScrollingSlider({ indicator: '' });

    await touchAt(slider, 0.21);
    expect(getPart(slider, '.text').textContent).toBe('50');

    slider.valuetext = 'V';
    slider.valuetext = null;
    expect(getPart(slider, '.text').textContent).toBe('50');
  });

  it('should follow the value attribute after a scroll', async () => {
    const slider = createScrollingSlider({ value: '30' });

    await pan(slider, 0.7);
    slider.setAttribute('value', '60');

    expect(slider.value).toBe(60);
  });

  it('should follow the midpoint after a scroll', async () => {
    const slider = createScrollingSlider();

    await pan(slider, 0.3);
    slider.max = 300;

    expect(slider.value).toBe(150);
  });

  it('should keep a number out of bounds through a scroll', async () => {
    const slider = createScrollingSlider();
    slider.value = 200;

    await pan(slider, 0.3);
    slider.max = 300;

    expect(slider.value).toBe(200);
  });

  it.each([
    [
      'value',
      '30',
      90,
      (slider: Slider) => {
        slider.value = 90;
      },
    ],
    [
      'the value attribute',
      '30',
      60,
      (slider: Slider) => slider.setAttribute('value', '60'),
    ],
    [
      'a bound',
      '80',
      50,
      (slider: Slider) => {
        slider.max = 50;
      },
    ],
    ['a form reset', '30', 30, (slider: Slider) => slider.form!.reset()],
  ])(
    'should keep %s written during a press that becomes a scroll',
    async (_, value, expected, write) => {
      const slider = createScrollingSlider({ value });
      const events = recordEvents(slider);

      await pan(slider, 0.7, () => write(slider));

      expect(slider.value).toBe(expected);
      expect(getInput(slider).value).toBe(String(expected));
      expect(events).toEqual([]);
    },
  );

  it('should fire input and then change on a tap', async () => {
    const slider = createScrollingSlider();
    const seen: string[] = [];

    for (const type of ['input', 'change']) {
      slider.addEventListener(type, () => {
        seen.push(`${type} ${slider.value}`);
      });
    }

    await touchAt(slider, 0.21);
    expect(seen).toEqual([]);

    await lift();
    expect(seen).toEqual(['input 21', 'change 21']);
    expect(read(slider)).toEqual([21, '21', 21]);
  });

  // Chromium's own: the script's number wins over the tap's.
  it('should keep a number written during a tap', async () => {
    const slider = createScrollingSlider({ value: '30' });
    const events = recordEvents(slider);

    await touchAt(slider, 0.7);
    slider.value = 90;
    await lift();

    expect(events).toEqual(['change 90']);
    expect(slider.value).toBe(90);
  });

  it('should fire nothing on a tap on the handle', async () => {
    const slider = createScrollingSlider();
    const events = recordEvents(slider);

    await touchAt(slider, 0.5);
    await lift();

    expect(events).toEqual([]);
  });

  it('should dispatch the input of a tap with the native flags', async () => {
    const slider = createScrollingSlider();
    const seen: Event[] = [];
    document.body.addEventListener(
      'input',
      (event) => {
        seen.push(event);
      },
      { signal: listeners.signal },
    );

    await touchAt(slider, 0.21);
    await lift();

    expect(seen).toHaveLength(1);
    expect(seen[0]!.constructor).toBe(Event);
    expect(seen[0]).toMatchObject({
      target: slider,
      bubbles: true,
      composed: true,
      cancelable: false,
    });
  });

  it.each([
    { name: 'a horizontal slide', offsets: [[60, 0]], value: 51 },
    {
      name: 'a slide that turns vertical',
      offsets: [
        [60, 0],
        [60, -100],
      ],
      value: 51,
    },
  ] as const)(
    'should fire input and one change on $name',
    async ({ offsets, value }) => {
      const slider = createScrollingSlider();
      const events = recordEvents(slider);

      await touchAt(slider, 0.21);
      await slide(pointAt(slider, 0.21), ...offsets);
      expect(events.at(-1)).toBe(`input ${value}`);

      await lift();
      expect(events.filter((entry) => entry.startsWith('change'))).toEqual([
        `change ${value}`,
      ]);
      expect(slider.value).toBe(value);
      expect(window.scrollY).toBe(0);
    },
  );

  it('should follow a slide from the handle at its first step', async () => {
    const slider = createScrollingSlider({ step: '25' });
    const events = recordEvents(slider);

    await touchAt(slider, 0.5);
    await slide(pointAt(slider, 0.5), [60, 0]);
    expect(events).toEqual(['input 75']);
    expect(slider.value).toBe(75);

    await lift();
    expect(events).toEqual(['input 75', 'change 75']);
    expect(window.scrollY).toBe(0);
  });

  it('should commit a slide that the system cancels', async () => {
    const slider = createScrollingSlider();
    const events = recordEvents(slider);

    await touchAt(slider, 0.21);
    await slide(pointAt(slider, 0.21), [60, 0]);
    await commands.touch('touchCancel');
    await settle();

    expect(slider.value).toBe(51);
    expect(events.slice(-2)).toEqual(['input 51', 'change 51']);
    expect(events.filter((entry) => entry.startsWith('change'))).toHaveLength(
      1,
    );
  });

  it('should do nothing on a second scroll', async () => {
    const slider = createScrollingSlider({ value: '30' });
    const events = recordEvents(slider);

    await pan(slider, 0.7);
    window.scrollTo(0, 0);
    await settle();
    await pan(slider, 0.7);

    expect(slider.value).toBe(30);
    expect(events).toEqual([]);
  });

  it('should fire nothing on a scroll after a slide that was ended by disabling', async () => {
    const slider = createScrollingSlider({ value: '30' });

    await touchAt(slider, 0.21);
    await slide(pointAt(slider, 0.21), [60, 0]);
    slider.disabled = true;
    await lift();
    slider.disabled = false;
    const events = recordEvents(slider);
    await pan(slider, 0.7);

    expect(slider.value).toBe(51);
    expect(events).toEqual([]);
  });

  // The engine commits the press.
  it('should take a held press when another element takes the focus', async () => {
    const slider = createScrollingSlider({ value: '30' });
    const other = document.createElement('button');
    document.body.append(other);
    const events = recordEvents(slider);

    slider.focus();
    await touchAt(slider, 0.7);
    expect(events).toEqual([]);
    other.focus();
    await settle();
    expect(events).toEqual(['input 70', 'change 70']);

    await lift();
    expect(events).toEqual(['input 70', 'change 70']);
    expect(slider.value).toBe(70);
  });

  it("should hold a pen's press until its release", async () => {
    const slider = createScrollingSlider({ value: '30' });
    const events = recordEvents(slider);
    const point = pointAt(slider, 0.7);

    await commands.pen('down', ...point);
    await settle();
    expect(slider.value).toBe(30);
    expect(events).toEqual([]);

    await commands.pen('up', ...point);
    await settle();
    expect(events).toEqual(['input 70', 'change 70']);
    expect(slider.value).toBe(70);
  });

  it('should take a key after a scroll', async () => {
    const slider = createScrollingSlider({ value: '30' });
    const events = recordEvents(slider);

    await pan(slider, 0.7);
    slider.focus();
    await userEvent.keyboard('{ArrowUp}');

    expect(events).toEqual(['input 31', 'change 31']);
  });

  it('should take a key that gives the number from before a scroll', async () => {
    const slider = createScrollingSlider({ value: '30' });

    await pan(slider, 0.7);
    slider.value = 29;
    const events = recordEvents(slider);
    slider.focus();
    await userEvent.keyboard('{ArrowUp}');

    expect(events).toEqual(['input 30', 'change 30']);
    expect(slider.value).toBe(30);
  });

  it('should take a tap after a scroll', async () => {
    const slider = createScrollingSlider({ value: '30' });
    const events = recordEvents(slider);

    await pan(slider, 0.7);
    window.scrollTo(0, 0);
    await settle();
    await touchAt(slider, 0.5);
    await lift();

    expect(events).toEqual(['input 50', 'change 50']);
  });

  it('should drop a held press when it is moved in the DOM', async () => {
    const slider = createScrollingSlider({ value: '30' });
    const events = recordEvents(slider);

    await touchAt(slider, 0.7);
    document.body.append(slider);
    await lift();

    expect(slider.value).toBe(30);
    expect(getInput(slider).value).toBe('30');
    expect(events).toEqual([]);
  });

  it('should drop a held press when it is disabled', async () => {
    const slider = createScrollingSlider({ value: '30' });
    const events = recordEvents(slider);

    await touchAt(slider, 0.7);
    slider.disabled = true;
    await lift();

    expect(slider.value).toBe(30);
    expect(getInput(slider).value).toBe('30');
    expect(events).toEqual([]);
  });

  it('should look held while a finger rests', async () => {
    const slider = createScrollingSlider({ indicator: '' });

    await touchAt(slider, 0.21);
    expect(readLook(slider)).toEqual(HELD);

    await lift();
    await expectResting(slider);
  });

  it('should not look held after a scroll', async () => {
    const slider = createScrollingSlider({ indicator: '' });

    await touchAt(slider, 0.21);
    await slide(pointAt(slider, 0.21), [0, -100]);
    await vi.waitFor(() => expect(window.scrollY).toBeGreaterThan(0));
    await expectResting(slider);
  });

  it('should not follow a second finger during a slide', async () => {
    const slider = createScrollingSlider({ indicator: '' });
    const events = recordEvents(slider);
    const second = pointAt(slider, 0.9);

    await touchAt(slider, 0.21);
    await slide(pointAt(slider, 0.21), [60, 0]);
    await commands.touch('touchStart', pointAt(slider, 0.51), second);
    await settle();
    expect(slider.value).toBe(51);
    expect(readLook(slider)).toEqual(HELD);

    // Chromium fires its own `change` when the second finger lifts.
    await commands.touch('touchEnd', [...second, 1]);
    await settle();
    expect(slider.value).toBe(51);
    expect(readLook(slider)).toEqual(HELD);

    await commands.touch('touchCancel');
    await settle();
    expect(slider.value).toBe(51);
    expect(events.filter((entry) => entry.startsWith('change'))).toEqual([
      'change 51',
    ]);
    await expectResting(slider);
  });

  it('should commit a slide that is cancelled with a second finger down', async () => {
    const slider = createScrollingSlider();
    const events = recordEvents(slider);

    await touchAt(slider, 0.21);
    await slide(pointAt(slider, 0.21), [60, 0]);
    await commands.touch(
      'touchStart',
      pointAt(slider, 0.51),
      pointAt(slider, 0.9),
    );
    await settle();
    await commands.touch('touchCancel');
    await settle();

    expect(slider.value).toBe(51);
    expect(events.slice(-2)).toEqual(['input 51', 'change 51']);
  });

  it.each([
    ['a tap', (slider: Slider) => touchAt(slider, 0.21).then(lift)],
    ['a scroll', (slider: Slider) => pan(slider, 0.21)],
  ] as const)(
    'should follow a finger that is not the first one down after %s',
    async (_, end) => {
      const slider = createScrollingSlider({ indicator: '' });
      await end(slider);
      window.scrollTo(0, 0);
      await expectResting(slider);
      const [x, y] = pointAt(slider, 0.8);

      // The first finger rests outside the slider.
      await commands.touch('touchStart', [x, y + 300]);
      await settle();
      await commands.touch('touchStart', [x, y + 300], [x, y]);
      await settle();

      expect(readLook(slider)).toEqual(HELD);
    },
  );

  it('should drop a held press that is cancelled after a second finger', async () => {
    const slider = createScrollingSlider({ value: '30' });
    const events = recordEvents(slider);

    await touchAt(slider, 0.7);
    await commands.touch(
      'touchStart',
      pointAt(slider, 0.7),
      pointAt(slider, 0.9),
    );
    await settle();
    await commands.touch('touchCancel');
    await settle();

    expect(slider.value).toBe(30);
    expect(getInput(slider).value).toBe('30');
    expect(events).toEqual([]);
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

  it.each(['', ' '])(
    'should refer to a label beside the aria-label "%s"',
    async (value) => {
      const slider = await createNamedSlider(['label']);
      slider.setAttribute('aria-label', value);
      await nextFrame();
      expect(inputName(slider)).toBe('L');

      slider.setAttribute('aria-label', 'A');
      await nextFrame();
      expect(inputName(slider)).toBe('A');

      slider.setAttribute('aria-label', value);
      await nextFrame();
      expect(inputName(slider)).toBe('L');
    },
  );

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

    it.each(['', ' '])(
      'should name the control from a label beside the aria-label "%s"',
      async (value) => {
        const slider = await createNamedSlider(['label']);
        slider.setAttribute('aria-label', value);
        await nextFrame();

        expect((await readControl()).name).toBe('L');
      },
    );

    it('should not expose the value indicator', async () => {
      const slider = await createNamedSlider(['slot']);
      slider.indicator = true;
      slider.valuetext = 'Shown';
      await userEvent.keyboard(TAB);
      expect(getPart(slider, '.text').checkVisibility()).toBe(true);

      const tree = JSON.stringify(
        await commands.readAccessibilityTree('#fixture', true),
      );

      // The reader gives text nodes, the label's among them.
      expect(tree).toContain('"role":"StaticText","name":"S"');
      expect(tree).not.toMatch(/"name":"Shown"/u);
    });
  },
);

describe('mx-slider value indicator', () => {
  function indicatorDisplay(slider: Slider): string {
    return getComputedStyle(getPart(slider, '.indicator')).display;
  }

  it('should not be shown at rest', () => {
    expect(indicatorDisplay(createSlider({ indicator: '' }))).toBe('none');
  });

  it('should be shown while the handle is held', async () => {
    const slider = createSlider({ indicator: '' });

    await press(slider, 0.5);
    expect(indicatorDisplay(slider)).toBe('flex');

    await release();
    await vi.waitFor(() => expect(indicatorDisplay(slider)).toBe('none'));
  });

  it('should be shown with keyboard focus', async () => {
    const slider = createSlider({ indicator: '' });

    await userEvent.keyboard(TAB);
    expect(indicatorDisplay(slider)).toBe('flex');

    getInput(slider).blur();
    await vi.waitFor(() => expect(indicatorDisplay(slider)).toBe('none'));
  });

  it('should not be shown without the attribute', async () => {
    const slider = createSlider();

    await press(slider, 0.5);

    expect(indicatorDisplay(slider)).toBe('none');
  });

  it('should hold the value', async () => {
    const slider = createSlider({ indicator: '' });

    expect(getPart(slider, '.text').textContent).toBe('50');

    await press(slider, 0.2);

    expect(getPart(slider, '.text').textContent).toBe('20');
  });

  it('should hold valuetext in place of the value', () => {
    const slider = createSlider({ indicator: '', valuetext: '-18°' });

    expect(getPart(slider, '.text').textContent).toBe('-18°');
  });

  it('should ignore a host aria-valuetext', () => {
    const slider = createSlider({ indicator: '', 'aria-valuetext': 'H' });

    expect(getPart(slider, '.text').textContent).toBe('50');
  });

  it('should write no text without the attribute', () => {
    const slider = createSlider({ valuetext: 'V' });

    slider.value = 30;

    expect(getPart(slider, '.text').textContent).toBe('');

    slider.indicator = true;

    expect(getPart(slider, '.text').textContent).toBe('V');
  });
});

describe('mx-slider held state', () => {
  /** Longer than the time after which WebKit drops `:active`. */
  const HOLD_MS = 400;

  async function hold(slider: Slider, fraction = 0.2): Promise<void> {
    await press(slider, fraction);
    // The time is what the rows hold the press for.
    await new Promise((resolve) => {
      setTimeout(resolve, HOLD_MS);
    });
  }

  it('should last while the pointer rests on the track', async () => {
    const slider = createSlider({ indicator: '' });

    await hold(slider);
    expect(readLook(slider)).toEqual(HELD);

    await release();
    await expectResting(slider);
  });

  it('should last while the pointer is outside the slider', async () => {
    const slider = createSlider({ indicator: '' });
    const [x, y] = pointAt(slider, 0.2);

    await hold(slider);
    await commands.pointerMove(x, y + 150, 4);
    await nextFrame();
    await nextFrame();
    expect(readLook(slider)).toEqual(HELD);

    await release();
    await expectResting(slider);
  });

  it('should not begin at a press on the label', async () => {
    const slider = createSlider({ indicator: '' });
    const { left, top, width, height } =
      addLabelContent(slider).getBoundingClientRect();

    await commands.pointerPress(left + width / 2, top + height / 2);
    await nextFrame();
    expect(readLook(slider)).toEqual(RESTING);
  });

  it('should not begin at a press of the right button', async () => {
    const slider = createSlider({ indicator: '' });

    await commands.pointerPress(...pointAt(slider, 0.2), 'right');

    try {
      await nextFrame();
      expect(readLook(slider)).toEqual(RESTING);
    } finally {
      await commands.pointerRelease('right');
    }
  });

  it('should end when the slider is disabled', async () => {
    const slider = createSlider({ indicator: '' });

    await press(slider, 0.2);
    expect(readLook(slider)).toEqual(HELD);
    slider.disabled = true;
    await expectResting(slider);

    slider.disabled = false;
    expect(readLook(slider)).toEqual(RESTING);
  });

  it('should begin anew after a release that was missed', async () => {
    const slider = createSlider({ indicator: '' });

    await press(slider, 0.2);
    slider.style.display = 'none';
    await release();
    // Ends the held look, which the missed release left.
    slider.disabled = true;
    slider.disabled = false;
    slider.style.display = '';
    await expectResting(slider);

    await press(slider, 0.8);
    expect(readLook(slider)).toEqual(HELD);

    await release();
    await expectResting(slider);
  });

  it('should end when the slider is removed', async () => {
    const slider = createSlider({ indicator: '' });

    await press(slider, 0.2);
    expect(readLook(slider)).toEqual(HELD);
    slider.remove();
    await release();
    document.body.append(slider);

    await expectResting(slider);
  });
});

describe('mx-slider value indicator hit test', () => {
  it('should pass through the indicator', async () => {
    const slider = createSlider({ indicator: '' });
    // Room for the indicator above the slider.
    slider.style.marginBlockStart = '100px';

    await press(slider, 0.5);
    const { left, top, width, height } = getPart(
      slider,
      '.text',
    ).getBoundingClientRect();

    expect(height).toBeGreaterThan(0);
    expect(
      document.elementFromPoint(left + width / 2, top + height / 2),
    ).not.toBe(slider);
  });
});

describe('mx-slider value indicator fade', () => {
  it('should run an opacity transition when it is shown', async () => {
    const slider = createSlider({ indicator: '' });
    const started: string[] = [];
    getPart(slider, '.indicator').addEventListener(
      'transitionrun',
      ({ propertyName }) => {
        started.push(propertyName);
      },
    );
    // The first style, from which the transition starts.
    await nextFrame();

    await press(slider, 0.2);

    await vi.waitFor(() => expect(started).toContain('opacity'));
  });
});

/** The left edge of the first character of the text that matches. */
function leftOf(slider: Slider, pattern: RegExp): number {
  const node = getPart(slider, '.text').firstChild!;
  const index = node.textContent!.search(pattern);
  const range = document.createRange();
  range.setStart(node, index);
  range.setEnd(node, index + 1);

  return range.getBoundingClientRect().left;
}

describe.each(['ltr', 'rtl'])('mx-slider signed indicator in %s', (dir) => {
  async function showText(attrs: Attributes): Promise<Slider> {
    const slider = createSlider({
      dir,
      indicator: '',
      min: '-55',
      max: '55',
      value: '-18',
      ...attrs,
    });
    await userEvent.keyboard(TAB);

    return slider;
  }

  it.each([
    ['the number', {}],
    ['valuetext', { valuetext: '-18°' }],
  ])('should draw the sign of %s at the left', async (_, attrs) => {
    const slider = await showText(attrs);

    expect(leftOf(slider, /-/u)).toBeLessThan(leftOf(slider, /\d/u));
  });

  it('should lay out a valuetext of Arabic letters from right to left', async () => {
    const slider = await showText({ valuetext: '-18 درجة' });

    expect(leftOf(slider, /-/u)).toBeGreaterThan(leftOf(slider, /\d/u));
  });
});

const TEXTS = [
  { name: '100', attrs: {} },
  { name: '1000000', attrs: { max: '1000000' } },
  {
    name: 'a long valuetext',
    attrs: { valuetext: 'A value text that is longer than the slider' },
  },
  {
    name: 'a long word',
    attrs: { valuetext: 'Avaluetextthatislongerthantheslider' },
  },
] as const;

describe.each(['ltr', 'rtl'])('mx-slider layout in %s', (dir) => {
  function overflowOf(element: Element): number {
    return element.scrollWidth - element.clientWidth;
  }

  function createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.dir = dir;
    container.style.cssText = `overflow: auto; inline-size: ${WIDTH}px; padding-block-start: 120px; white-space: nowrap`;
    document.body.append(container);

    return container;
  }

  it.each(['0', '1', '99', '100'])(
    'should have no scrollable overflow at %s',
    (value) => {
      const container = createContainer();
      createSlider(
        { value, indicator: '', valuetext: 'A long text' },
        container,
      );

      expect(overflowOf(container)).toBe(0);
      expect(container.scrollHeight).toBe(container.clientHeight);
    },
  );

  describe.each(TEXTS)('with the indicator shown for $name', ({ attrs }) => {
    it.each([0, 1])(
      'should stay between the ends without overflow at the fraction %s',
      async (fraction) => {
        const container = createContainer();
        const slider = createSlider({ indicator: '', ...attrs }, container);
        slider.value = fraction * (slider.max ?? 100);
        await userEvent.keyboard(TAB);
        const track = getPart(slider, '.track').getBoundingClientRect();
        const text = getPart(slider, '.text').getBoundingClientRect();

        expect(text.width).toBeGreaterThan(0);
        expect(text.left).toBeGreaterThanOrEqual(track.left - 0.05);
        expect(text.right).toBeLessThanOrEqual(track.right + 0.05);
        expect(overflowOf(container)).toBe(0);
        expect(container.scrollHeight).toBe(container.clientHeight);
      },
    );

    it.each([0, 1])(
      'should add no overflow to the page at the fraction %s',
      async (fraction) => {
        // A slider as wide as the page, whose own direction is the row's.
        const page = document.createElement('div');
        page.style.cssText =
          'position: absolute; inset-inline: 0; padding-block-start: 120px';
        document.body.append(page);
        const slider = createSlider({ dir, indicator: '', ...attrs }, page);
        slider.style.inlineSize = 'auto';
        slider.value = fraction * (slider.max ?? 100);
        await userEvent.keyboard(TAB);

        expect(getPart(slider, '.text').checkVisibility()).toBe(true);
        expect(overflowOf(document.documentElement)).toBe(0);
      },
    );
  });

  describe('the indicator place', () => {
    async function show(value: number): Promise<{
      offset: number;
      text: DOMRect;
      track: DOMRect;
    }> {
      const slider = createSlider({ dir, indicator: '', valuetext: 'Value' });
      slider.value = value;
      await userEvent.keyboard(TAB);
      const handle = getPart(slider, '.handle').getBoundingClientRect();
      const text = getPart(slider, '.text').getBoundingClientRect();
      const offset =
        text.left + text.width / 2 - handle.left - handle.width / 2;
      const track = getPart(slider, '.track').getBoundingClientRect();
      slider.remove();

      return { offset, text, track };
    }

    it('should be centred on the handle at 50', async () => {
      expect((await show(50)).offset).toBeCloseTo(0, 1);
    });

    it('should be centred on the handle at the first value where it fits', async () => {
      const { text } = await show(50);
      // The handle's centre is 2px from the end at 0, and 2px further at each 1.
      const first = Math.ceil((text.width / 2 - 2) / 2);

      expect((await show(first)).offset).toBeCloseTo(0, 1);
      expect((await show(100 - first)).offset).toBeCloseTo(0, 1);
      expect(Math.abs((await show(first - 2)).offset)).toBeGreaterThan(1);
    });

    it('should touch the end where it does not fit', async () => {
      const start = await show(0);
      const end = await show(100);
      const [left, right] = dir === 'ltr' ? [start, end] : [end, start];

      expect(left.text.left).toBeCloseTo(left.track.left, 1);
      expect(right.text.right).toBeCloseTo(right.track.right, 1);
    });
  });
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
