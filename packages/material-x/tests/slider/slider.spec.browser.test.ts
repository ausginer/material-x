import { afterEach, describe, expect, it } from 'vitest';
import { commands, server, userEvent } from 'vitest/browser';
import type Slider from '../../src/slider/slider.ts';
import '../../src/slider/slider.ts';
import { nextFrame, pixels, resolveComputed, srgb } from '../browser.ts';

const TAB = server.browser === 'safari' ? '{Alt>}{Tab}{/Alt}' : '{Tab}';

const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;

type Size = (typeof SIZES)[number];
type State = 'default' | 'focus' | 'pressed' | 'disabled';
type Values = Readonly<Record<string, string | number>>;

const WIDTH = 404;

async function resolveTokens<T extends string>(
  contract: string,
  state: State,
  tokens: readonly T[],
): Promise<Readonly<Record<T, string | number>>> {
  const { values } = await commands.resolveTokenContract({
    contract,
    state,
    tokens,
  });

  return values;
}

function createSlider(
  attrs: Readonly<Record<string, string>> = {},
  size: Size = 'xsmall',
): Slider {
  const slider = document.createElement('mx-slider');

  slider.style.inlineSize = `${WIDTH}px`;
  slider.style.marginBlockStart = '80px';

  if (size !== 'xsmall') {
    slider.size = size;
  }

  for (const [name, value] of Object.entries(attrs)) {
    slider.setAttribute(name, value);
  }

  document.body.append(slider);

  return slider;
}

function getPart(slider: Slider, selector: string): HTMLElement {
  return slider.shadowRoot!.querySelector<HTMLElement>(selector)!;
}

function trackEnd(
  slider: Slider,
  pseudo: '::before' | '::after',
): CSSStyleDeclaration {
  return getComputedStyle(getPart(slider, '.track'), pseudo);
}

function handleCentre(slider: Slider): number {
  const track = getPart(slider, '.track').getBoundingClientRect();
  const handle = getPart(slider, '.handle').getBoundingClientRect();

  return handle.left + handle.width / 2 - track.left;
}

async function enter(slider: Slider, state: State): Promise<void> {
  if (state === 'focus') {
    await userEvent.keyboard(TAB);
  } else if (state === 'pressed') {
    const { left, top, width, height } = getPart(
      slider,
      '.handle',
    ).getBoundingClientRect();

    await commands.pointerPress(left + width / 2, top + height / 2);
  } else if (state === 'disabled') {
    slider.disabled = true;
  }

  await nextFrame();
}

afterEach(async () => {
  // A row that fails mid-gesture leaves the button down.
  await commands.pointerRelease().catch(() => {});
});

function withOpacity(
  channels: readonly number[],
  opacity: string | number,
): readonly number[] {
  return [
    ...channels.slice(0, 3),
    Math.round(channels[3]! * Number(opacity) * 100) / 100,
  ];
}

/** A colour token at an opacity token, resolved in the document. */
function expectedColor(
  color: string | number,
  opacity: string | number = 1,
): readonly number[] {
  return withOpacity(srgb(resolveComputed('color', String(color))), opacity);
}

/** The colour that a part's background paints at its own opacity. */
function paintedColor(style: CSSStyleDeclaration): readonly number[] {
  return withOpacity(srgb(style.backgroundColor), style.opacity);
}

/** The colour of the stop indicator, the first stop of its gradient. */
function stopColor(slider: Slider): readonly number[] {
  const [color] = /(?:rgba?|color)\([^)]*\)/u.exec(
    trackEnd(slider, '::after').backgroundImage,
  )!;

  return withOpacity(srgb(color), 1);
}

describe.each(SIZES)('mx-slider %s geometry contract', (size) => {
  const contract = `slider.size.${size}`;

  it('should render the handle height', async () => {
    const tokens = await resolveTokens(contract, 'default', [
      'active.handle.height',
    ]);
    const handle = getPart(createSlider({}, size), '.handle');

    expect(handle.getBoundingClientRect().height).toBe(
      pixels(tokens['active.handle.height']),
    );
  });

  it('should render each track height, centred on the handle', async () => {
    const tokens = await resolveTokens(contract, 'default', [
      'active.handle.height',
      'active.track.height',
      'inactive.track.height',
    ]);
    const slider = createSlider({}, size);

    for (const [pseudo, token] of [
      ['::before', 'active.track.height'],
      ['::after', 'inactive.track.height'],
    ] as const) {
      const style = trackEnd(slider, pseudo);
      const expected = pixels(tokens[token]);

      expect(pixels(style.height)).toBe(expected);
      expect(pixels(style.top)).toBe(
        (pixels(tokens['active.handle.height']) - expected) / 2,
      );
    }
  });

  it('should render the outer and the inner corners', async () => {
    const outer = await resolveTokens(contract, 'default', [
      'active.track.shape.leading',
      'inactive.track.shape.trailing',
    ]);
    const inner = await resolveTokens('slider.default', 'default', [
      'active.track.inner-corner.corner-size.top-right',
      'active.track.inner-corner.corner-size.bottom-right',
    ]);
    const slider = createSlider({}, size);
    const active = trackEnd(slider, '::before');
    const inactive = trackEnd(slider, '::after');

    expect([
      active.borderTopLeftRadius,
      active.borderTopRightRadius,
      active.borderBottomRightRadius,
      active.borderBottomLeftRadius,
    ]).toEqual([
      outer['active.track.shape.leading'],
      inner['active.track.inner-corner.corner-size.top-right'],
      inner['active.track.inner-corner.corner-size.bottom-right'],
      outer['active.track.shape.leading'],
    ]);
    expect([
      inactive.borderTopLeftRadius,
      inactive.borderTopRightRadius,
      inactive.borderBottomRightRadius,
      inactive.borderBottomLeftRadius,
    ]).toEqual([
      inner['active.track.inner-corner.corner-size.top-right'],
      outer['inactive.track.shape.trailing'],
      outer['inactive.track.shape.trailing'],
      inner['active.track.inner-corner.corner-size.bottom-right'],
    ]);
  });
});

describe('mx-slider RTL corners', () => {
  it('should mirror the corners', async () => {
    const tokens = await resolveTokens('slider.size.large', 'default', [
      'active.track.shape.leading',
      'inactive.track.shape.trailing',
    ]);
    const slider = createSlider({ dir: 'rtl' }, 'large');

    expect(trackEnd(slider, '::before').borderTopRightRadius).toBe(
      tokens['active.track.shape.leading'],
    );
    expect(trackEnd(slider, '::after').borderTopLeftRadius).toBe(
      tokens['inactive.track.shape.trailing'],
    );
  });
});

describe.each(['ltr', 'rtl'])('mx-slider %s track ends contract', (dir) => {
  describe.each(['default', 'focus', 'pressed', 'disabled'] as const)(
    '%s',
    (state) => {
      it('should render the handle width on the value', async () => {
        const tokens = await resolveTokens('slider.default', state, [
          'handle.width',
        ]);
        const slider = createSlider({ dir, value: '25' });
        await enter(slider, state);
        const handle = getPart(slider, '.handle');

        expect(handle.getBoundingClientRect().width).toBe(
          pixels(tokens['handle.width']),
        );
        // A 4px thumb travels 400px.
        expect(handleCentre(slider)).toBeCloseTo(
          dir === 'ltr' ? 102 : WIDTH - 102,
          1,
        );
      });

      it('should leave the space tokens beside the handle', async () => {
        const tokens = await resolveTokens('slider.default', state, [
          'handle.width',
          'active.handle.leading-space',
          'active.handle.trailing-space',
        ]);
        const slider = createSlider({ dir, value: '25' });
        await enter(slider, state);
        const half = pixels(tokens['handle.width']) / 2;
        const active = trackEnd(slider, '::before');
        const inactive = trackEnd(slider, '::after');

        expect(pixels(active.width)).toBeCloseTo(
          102 - half - pixels(tokens['active.handle.leading-space']),
          1,
        );
        expect(pixels(inactive.width)).toBeCloseTo(
          WIDTH - 102 - half - pixels(tokens['active.handle.trailing-space']),
          1,
        );
        expect(pixels(dir === 'ltr' ? active.left : active.right)).toBe(0);
        expect(pixels(dir === 'ltr' ? inactive.right : inactive.left)).toBe(0);
      });
    },
  );
});

describe('mx-slider track ends', () => {
  it.each([
    ['0', '::before'],
    ['100', '::after'],
  ] as const)('should have no size at %s on its side', (value, pseudo) => {
    const style = trackEnd(createSlider({ value }), pseudo);

    expect(pixels(style.width)).toBe(0);
  });
});

describe('mx-slider stop indicator contract', () => {
  it.each(['ltr', 'rtl'])('should render its place in %s', async (dir) => {
    const tokens = await resolveTokens('slider.default', 'default', [
      'stop-indicator.size',
      'stop-indicator.trailing-space',
    ]);
    const style = trackEnd(createSlider({ dir, value: '25' }), '::after');
    const start = pixels(style.paddingLeft);
    const end = pixels(style.paddingRight);

    expect(dir === 'ltr' ? end : start).toBe(
      pixels(tokens['stop-indicator.trailing-space']),
    );
    expect(pixels(style.width) - start - end).toBeCloseTo(
      pixels(tokens['stop-indicator.size']),
      2,
    );
    expect(
      pixels(style.height) -
        pixels(style.paddingTop) -
        pixels(style.paddingBottom),
    ).toBe(pixels(tokens['stop-indicator.size']));
    expect(style.paddingTop).toBe(style.paddingBottom);
    expect(style.backgroundOrigin.split(', ')[0]).toBe('content-box');
    expect(style.backgroundClip.split(', ')[0]).toBe('content-box');
  });
});

describe.each(['default', 'focus', 'pressed', 'disabled'] as const)(
  'mx-slider %s color contract',
  (state) => {
    async function resolveColors(): Promise<Values> {
      return await resolveTokens('slider.default', state, [
        'handle.color',
        'active.track.color',
        'inactive.track.color',
        'stop-indicator.color',
        ...(state === 'disabled'
          ? [
              'handle.opacity',
              'active.track.opacity',
              'inactive.track.opacity',
              'stop-indicator.opacity',
            ]
          : []),
      ]);
    }

    it.each([
      {
        part: 'handle',
        read: (slider: Slider) =>
          paintedColor(getComputedStyle(getPart(slider, '.handle'))),
      },
      {
        part: 'active.track',
        read: (slider: Slider) => paintedColor(trackEnd(slider, '::before')),
      },
      {
        part: 'inactive.track',
        read: (slider: Slider) => paintedColor(trackEnd(slider, '::after')),
      },
      { part: 'stop-indicator', read: stopColor },
    ])('should paint the $part', async ({ part, read }) => {
      const tokens = await resolveColors();
      const slider = createSlider();
      await enter(slider, state);

      expect(read(slider)).toEqual(
        expectedColor(tokens[`${part}.color`]!, tokens[`${part}.opacity`]),
      );
    });
  },
);

describe('mx-slider handle contract', () => {
  it.each(['default', 'focus', 'pressed', 'disabled'] as const)(
    'should render a full corner in the %s state',
    async (state) => {
      const { 'handle.shape': shape } = await resolveTokens(
        'slider.default',
        state,
        ['handle.shape'],
      );
      const slider = createSlider();
      await enter(slider, state);
      const handle = getPart(slider, '.handle');

      // The package's form of `full` is half the handle's width.
      expect(shape).toMatch(/\/ 2\)$/u);
      expect(pixels(getComputedStyle(handle).borderTopLeftRadius)).toBe(
        handle.getBoundingClientRect().width / 2,
      );
    },
  );

  it('should draw the focus indicator around the handle', async () => {
    const tokens = await resolveTokens('slider.default', 'focus', [
      'focus.indicator.thickness',
      'focus.indicator.outline.offset',
      'focus.indicator.color',
    ]);
    const slider = createSlider();
    await enter(slider, 'focus');
    const style = getComputedStyle(getPart(slider, '.handle'));

    expect(style.outlineStyle).toBe('solid');
    expect(style.outlineWidth).toBe(tokens['focus.indicator.thickness']);
    expect(style.outlineOffset).toBe(tokens['focus.indicator.outline.offset']);
    expect(srgb(style.outlineColor)).toEqual(
      expectedColor(tokens['focus.indicator.color']),
    );
  });

  it('should draw no focus indicator on a press', async () => {
    const slider = createSlider();
    await enter(slider, 'pressed');

    expect(getComputedStyle(getPart(slider, '.handle')).outlineStyle).toBe(
      'none',
    );
  });

  it('should keep the held width while the pointer is outside', async () => {
    const tokens = await resolveTokens('slider.default', 'pressed', [
      'handle.width',
    ]);
    const slider = createSlider();
    await enter(slider, 'pressed');
    await commands.pointerMove(600, 400, 1);
    await nextFrame();

    expect(getPart(slider, '.handle').getBoundingClientRect().width).toBe(
      pixels(tokens['handle.width']),
    );
  });
});

/**
 * source: Material Components for Android, `Widget.Material3.Slider.Label` at
 *   3a2969935: `paddingStart` and `paddingEnd` of 10dp.
 * reviewed: 2026-11-23
 * reason: no current token gives the value indicator's inline padding.
 */
const INDICATOR_INLINE_PADDING = 10;

describe('mx-slider value indicator contract', () => {
  const TEXT = 'value-indicator.label.label-text';

  async function createHeld(
    attrs: Readonly<Record<string, string>> = {},
  ): Promise<readonly [Slider, CSSStyleDeclaration]> {
    const slider = createSlider({ indicator: '', value: '25', ...attrs });
    await enter(slider, 'pressed');

    return [slider, getComputedStyle(getPart(slider, '.handle'), '::after')];
  }

  it('should render its box', async () => {
    const tokens = await resolveTokens('slider.default', 'pressed', [
      `${TEXT}.line-height`,
      'value-indicator.active.bottom-space',
    ]);
    const [, style] = await createHeld();
    const space = pixels(tokens['value-indicator.active.bottom-space']);
    const lineHeight = pixels(tokens[`${TEXT}.line-height`]);

    expect(pixels(style.height)).toBe(lineHeight);
    expect(pixels(style.paddingTop)).toBe(space);
    expect(pixels(style.paddingBottom)).toBe(space);
    expect(pixels(style.paddingLeft)).toBe(INDICATOR_INLINE_PADDING);
    expect(pixels(style.paddingRight)).toBe(INDICATOR_INLINE_PADDING);
    // A full corner: half the block size.
    expect(pixels(style.borderTopLeftRadius)).toBe(
      (lineHeight + 2 * space) / 2,
    );
  });

  it('should render above the handle by the space token', async () => {
    const tokens = await resolveTokens('slider.default', 'pressed', [
      'value-indicator.active.bottom-space',
    ]);
    const [slider, style] = await createHeld();

    expect(pixels(style.bottom)).toBe(
      getPart(slider, '.handle').getBoundingClientRect().height +
        pixels(tokens['value-indicator.active.bottom-space']),
    );
  });

  it.each(['ltr', 'rtl'])(
    'should be centred on the handle in %s',
    async (dir) => {
      const [slider, style] = await createHeld({ dir });
      const outer =
        pixels(style.width) +
        pixels(style.paddingLeft) +
        pixels(style.paddingRight);

      expect(
        pixels(style.left) + pixels(style.marginLeft) + outer / 2,
      ).toBeCloseTo(
        getPart(slider, '.handle').getBoundingClientRect().width / 2,
        1,
      );
    },
  );

  it('should render its colors', async () => {
    const tokens = await resolveTokens('slider.default', 'pressed', [
      'value-indicator.container.color',
      `${TEXT}.color`,
    ]);
    const [, style] = await createHeld();

    expect(srgb(style.backgroundColor)).toEqual(
      expectedColor(tokens['value-indicator.container.color']),
    );
    expect(srgb(style.color)).toEqual(expectedColor(tokens[`${TEXT}.color`]));
  });

  it.each([
    ['font', 'font-family'],
    ['size', 'font-size'],
    ['weight', 'font-weight'],
    ['line-height', 'line-height'],
    ['tracking', 'letter-spacing'],
  ])("should render its label's %s", async (token, property) => {
    const name = `${TEXT}.${token}`;
    const tokens = await resolveTokens('slider.default', 'pressed', [name]);
    const [, style] = await createHeld();

    expect(style.getPropertyValue(property)).toBe(
      resolveComputed(property, String(tokens[name])),
    );
  });

  it('should fade by opacity over the motion tokens', async () => {
    const tokens = await resolveTokens('slider.default', 'pressed', [
      'value-indicator.duration',
      'value-indicator.easing',
    ]);
    const [, style] = await createHeld();

    expect(style.transitionProperty).toBe('opacity, display');
    expect(style.transitionDuration.split(', ')[0]).toBe(
      resolveComputed(
        'transition-duration',
        String(tokens['value-indicator.duration']),
      ),
    );
    expect(
      style.transitionTimingFunction.startsWith(
        resolveComputed(
          'transition-timing-function',
          String(tokens['value-indicator.easing']),
        ),
      ),
    ).toBe(true);
  });
});

describe('mx-slider public CSS overrides', () => {
  const COLOR = 'rgb(1, 2, 3)';

  it.each([
    [
      'active-track',
      (slider: Slider) => paintedColor(trackEnd(slider, '::before')),
    ],
    [
      'inactive-track',
      (slider: Slider) => paintedColor(trackEnd(slider, '::after')),
    ],
    [
      'handle',
      (slider: Slider) =>
        paintedColor(getComputedStyle(getPart(slider, '.handle'))),
    ],
    ['stop-indicator', stopColor],
  ])('should apply --md-slider-%s-color', (part, read) => {
    const slider = createSlider();
    slider.style.setProperty(`--md-slider-${part}-color`, COLOR);

    expect(read(slider)).toEqual([1, 2, 3, 1]);
  });

  it('should show nothing of a transparent inactive track', () => {
    const slider = createSlider();
    slider.style.setProperty('--md-slider-inactive-track-color', 'transparent');

    expect(paintedColor(trackEnd(slider, '::after'))[3]).toBe(0);
  });
});
