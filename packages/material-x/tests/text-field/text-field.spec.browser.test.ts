import { describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import '../../src/text-field/multiline-text-field.ts';
import '../../src/text-field/text-field.ts';
import { nextFrame, pixels, resolveComputed } from '../browser.ts';

type FieldElement = HTMLElement & {
  setValidity(flags?: ValidityStateFlags, message?: string): void;
  checkValidity(): boolean;
};

const TAGS = ['mx-text-field', 'mx-multiline-text-field'] as const;

type Variant = Readonly<{
  name: string;
  outlined: boolean;
  contracts: Readonly<Record<'rest' | 'error' | 'disabled', string>>;
}>;

const VARIANTS: readonly Variant[] = [
  {
    name: 'filled',
    outlined: false,
    contracts: {
      rest: 'text-field.default',
      error: 'text-field.error',
      disabled: 'text-field.disabled',
    },
  },
  {
    name: 'outlined',
    outlined: true,
    contracts: {
      rest: 'text-field.outlined',
      error: 'text-field.outlined.error',
      disabled: 'text-field.outlined.disabled',
    },
  },
];

const CASES = VARIANTS.flatMap((variant) =>
  TAGS.map((tag) => ({ ...variant, tag })),
);

type State = 'rest' | 'hover' | 'focus' | 'error' | 'disabled';

const STATES: readonly State[] = [
  'rest',
  'hover',
  'focus',
  'error',
  'disabled',
];

/** The package and its state that tproc selects for each state of a field. */
const STATE_PATHS: Readonly<
  Record<State, readonly [keyof Variant['contracts'], string]>
> = {
  rest: ['rest', 'default'],
  hover: ['rest', 'hover'],
  focus: ['rest', 'focus'],
  error: ['error', 'error.default'],
  disabled: ['disabled', 'disabled'],
};

function contractOf(
  variant: Variant,
  state: State,
): Readonly<{ contract: string; state: string }> {
  const [contract, path] = STATE_PATHS[state];

  return { contract: variant.contracts[contract], state: path };
}

async function resolveTokens(
  variant: Variant,
  state: State,
  tokens: readonly string[],
): Promise<Readonly<Record<string, string | number>>> {
  const { values } = await commands.resolveTokenContract({
    ...contractOf(variant, state),
    tokens,
  });

  return values;
}

type CreateOptions = Readonly<{ value?: string; disabled?: boolean }>;

/** A field with content in each slot, so every part has a box. */
async function createField(
  tag: string,
  outlined: boolean,
  { value, disabled = false }: CreateOptions = {},
): Promise<FieldElement> {
  const field = document.createElement(tag) as FieldElement;

  for (const [slot, text] of [
    ['label', 'Label'],
    ['support', 'Support'],
    ['lead', 'L'],
    ['trail', 'T'],
    ['prefix', '$'],
    ['suffix', 'kg'],
  ] as const) {
    const content = document.createElement('span');
    content.slot = slot;
    content.textContent = text;
    field.append(content);
  }

  // The label and the affixes animate between their resting and populated
  // places, and the label's colour with them, so each reading is taken at the
  // end state.
  field.style.setProperty('--md-text-field-focus-duration', '0s');
  field.toggleAttribute('outlined', outlined);
  field.toggleAttribute('disabled', disabled);

  if (value !== undefined) {
    field.setAttribute('value', value);
  }

  document.body.append(field);
  await nextFrame();

  return field;
}

async function enter(field: FieldElement, state: State): Promise<void> {
  if (state === 'hover') {
    await userEvent.hover(field);
  } else if (state === 'focus') {
    getPart(field, '.input').focus();
  } else if (state === 'error') {
    field.setValidity({ customError: true }, 'Error');
    field.checkValidity();
  }

  await nextFrame();
}

function getPart(field: HTMLElement, selector: string): HTMLElement {
  return field.shadowRoot!.querySelector<HTMLElement>(selector)!;
}

function getSlotted(field: HTMLElement, slot: string): HTMLElement {
  return field.querySelector<HTMLElement>(`[slot="${slot}"]`)!;
}

/**
 * The element that draws the outlined field's outline below the input. The
 * notched outline's last child draws its bottom edge, which has no notch.
 */
function getOutlineEdge(field: HTMLElement): HTMLElement {
  return getPart(field, '.notched-outline').lastElementChild as HTMLElement;
}

/** The element's parent in the flat tree, through its slot and its host. */
function flatParent(element: Element): Element | null {
  return (
    element.assignedSlot ??
    element.parentElement ??
    (element.parentNode as ShadowRoot | null)?.host ??
    null
  );
}

/** The opacity the element is painted at: its own and its ancestors'. */
function paintedOpacity(element: Element): number {
  let opacity = 1;

  for (let node: Element | null = element; node; node = flatParent(node)) {
    opacity *= Number(getComputedStyle(node).opacity);
  }

  return opacity;
}

/**
 * A computed colour as 8-bit sRGB channels and an alpha, whichever of the
 * `rgb()` and `color(srgb …)` serializations the engine gives it.
 */
function srgb(computed: string): readonly number[] {
  const [red, green, blue, alpha = 1] = computed
    .match(/\d+(?:\.\d+)?(?:e-?\d+)?/gu)!
    .map(Number);
  const scale = computed.startsWith('color(srgb') ? 255 : 1;

  return [
    Math.round(red! * scale),
    Math.round(green! * scale),
    Math.round(blue! * scale),
    alpha,
  ];
}

function withAlpha(
  channels: readonly number[],
  opacity: number,
): readonly number[] {
  return [
    ...channels.slice(0, 3),
    Math.round(channels[3]! * opacity * 100) / 100,
  ];
}

/** The colour `property` paints on `element`, at the element's painted opacity. */
function paintedColor(element: Element, property: string): readonly number[] {
  return withAlpha(
    srgb(getComputedStyle(element).getPropertyValue(property)),
    paintedOpacity(element),
  );
}

/** A colour token at an opacity token, resolved in the document. */
function expectedColor(
  color: string | number,
  opacity: string | number = 1,
): readonly number[] {
  return withAlpha(
    srgb(resolveComputed('color', String(color))),
    Number(opacity),
  );
}

type Part = Readonly<{
  name: string;
  color: string;
  opacity: string;
  element: (field: HTMLElement) => HTMLElement;
  property: string;
  variants?: 'filled' | 'outlined';
  states?: readonly State[];
}>;

/**
 * Each part whose colour a state changes. A disabled part is drawn at its own
 * opacity token.
 */
const COLORED_PARTS: readonly Part[] = [
  {
    name: 'populated label',
    color: 'label-text.color',
    opacity: 'label-text.opacity',
    element: (field) => getSlotted(field, 'label'),
    property: 'color',
  },
  {
    name: 'input text',
    color: 'input-text.color',
    opacity: 'input-text.opacity',
    element: (field) => getPart(field, '.input'),
    property: 'color',
  },
  {
    name: 'supporting text',
    color: 'supporting-text.color',
    opacity: 'supporting-text.opacity',
    element: (field) => getSlotted(field, 'support'),
    property: 'color',
  },
  {
    name: 'active indicator',
    color: 'active-indicator.color',
    opacity: 'active-indicator.opacity',
    element: (field) => getPart(field, '.notched-outline'),
    property: 'border-block-end-color',
    variants: 'filled',
  },
  {
    name: 'container',
    color: 'container.color',
    opacity: 'container.opacity',
    element: (field) => getPart(field, '.notched-outline'),
    property: 'background-color',
    variants: 'filled',
    states: ['rest', 'hover', 'focus', 'disabled'],
  },
  {
    name: 'outline',
    color: 'outline.color',
    opacity: 'outline.opacity',
    element: getOutlineEdge,
    property: 'border-block-end-color',
    variants: 'outlined',
  },
  {
    name: 'leading icon',
    color: 'leading-icon.color',
    opacity: 'leading-icon.opacity',
    element: (field) => getSlotted(field, 'lead'),
    property: 'color',
    states: ['disabled'],
  },
  {
    name: 'trailing icon',
    color: 'trailing-icon.color',
    opacity: 'trailing-icon.opacity',
    element: (field) => getSlotted(field, 'trail'),
    property: 'color',
    states: ['disabled'],
  },
];

const COLOR_ROWS = CASES.flatMap((testCase) =>
  COLORED_PARTS.filter(
    (part) => !part.variants || part.variants === testCase.name,
  ).flatMap((part) =>
    (part.states ?? STATES).map((state) => ({ ...testCase, part, state })),
  ),
);

describe('text field colour contract', () => {
  it.each(COLOR_ROWS)(
    'should draw the $tag $name $part.name in its $state colour',
    async ({ tag, outlined, part, state, ...variant }) => {
      const disabled = state === 'disabled';
      const values = await resolveTokens({ ...variant, outlined }, state, [
        part.color,
        ...(disabled ? [part.opacity] : []),
      ]);
      const field = await createField(tag, outlined, {
        value: 'Value',
        disabled,
      });
      await enter(field, state);

      expect(paintedColor(part.element(field), part.property)).toEqual(
        expectedColor(
          values[part.color]!,
          disabled ? values[part.opacity]! : 1,
        ),
      );
    },
  );
});

type Edge = Readonly<{
  name: string;
  token: string;
  element: (field: HTMLElement) => HTMLElement;
  variants: 'filled' | 'outlined';
}>;

const EDGES: readonly Edge[] = [
  {
    name: 'active indicator',
    token: 'active-indicator.thickness',
    element: (field) => getPart(field, '.notched-outline'),
    variants: 'filled',
  },
  {
    name: 'outline',
    token: 'outline.width',
    element: getOutlineEdge,
    variants: 'outlined',
  },
];

const EDGE_ROWS = CASES.flatMap((testCase) =>
  EDGES.filter((edge) => edge.variants === testCase.name).flatMap((edge) =>
    (['rest', 'hover', 'focus', 'disabled'] as const).map((state) => ({
      ...testCase,
      edge,
      state,
    })),
  ),
);

describe('text field edge contract', () => {
  it.each(EDGE_ROWS)(
    'should draw the $tag $name $edge.name at its $state width',
    async ({ tag, outlined, edge, state, ...variant }) => {
      const values = await resolveTokens({ ...variant, outlined }, state, [
        edge.token,
      ]);
      const field = await createField(tag, outlined, {
        disabled: state === 'disabled',
      });
      await enter(field, state);

      expect(getComputedStyle(edge.element(field)).borderBlockEndWidth).toBe(
        values[edge.token],
      );
    },
  );
});

type Typography = Readonly<{
  name: string;
  prefix: string;
  element: (field: HTMLElement) => HTMLElement;
}>;

/**
 * The prefix and the suffix are part of the input's line, so they take the
 * input text's typography.
 */
const TYPOGRAPHY: readonly Typography[] = [
  {
    name: 'label',
    prefix: 'label-text',
    element: (field) => getSlotted(field, 'label'),
  },
  {
    name: 'input text',
    prefix: 'input-text',
    element: (field) => getPart(field, '.input'),
  },
  {
    name: 'supporting text',
    prefix: 'supporting-text',
    element: (field) => getSlotted(field, 'support'),
  },
  {
    name: 'prefix',
    prefix: 'input-text',
    element: (field) => getSlotted(field, 'prefix'),
  },
  {
    name: 'suffix',
    prefix: 'input-text',
    element: (field) => getSlotted(field, 'suffix'),
  },
];

const TYPOGRAPHY_ROWS = CASES.flatMap((testCase) =>
  TYPOGRAPHY.map((typography) => ({ ...testCase, typography })),
);

describe('text field typography contract', () => {
  it.each(TYPOGRAPHY_ROWS)(
    'should set the $tag $name $typography.name in its typeface',
    async ({ tag, outlined, typography, ...variant }) => {
      const tokens = ['font', 'size', 'weight', 'line-height'].map(
        (name) => `${typography.prefix}.${name}`,
      );
      const values = await resolveTokens(
        { ...variant, outlined },
        'rest',
        tokens,
      );
      const style = getComputedStyle(
        typography.element(await createField(tag, outlined)),
      );
      const [font, size, weight, lineHeight] = tokens.map((token) =>
        String(values[token]!),
      );

      expect({
        family: style.fontFamily,
        size: style.fontSize,
        weight: style.fontWeight,
        lineHeight: style.lineHeight,
      }).toEqual({
        family: resolveComputed('font-family', font!),
        size: size!,
        weight: resolveComputed('font-weight', weight!),
        lineHeight: lineHeight!,
      });
    },
  );
});

const AFFIXES = [
  { name: 'prefix', token: 'input-text.prefix.color' },
  { name: 'suffix', token: 'input-text.suffix.color' },
] as const;

describe('text field affix colour contract', () => {
  it.each(
    CASES.flatMap((testCase) =>
      AFFIXES.map((affix) => ({ ...testCase, affix })),
    ),
  )(
    'should draw the $tag $name $affix.name in its own colour',
    async ({ tag, outlined, affix, ...variant }) => {
      const values = await resolveTokens({ ...variant, outlined }, 'rest', [
        affix.token,
      ]);
      const field = await createField(tag, outlined, { value: 'Value' });

      expect(paintedColor(getSlotted(field, affix.name), 'color')).toEqual(
        expectedColor(values[affix.token]!),
      );
    },
  );
});

describe.each(CASES)('$tag $name container contract', (testCase) => {
  const { tag, outlined } = testCase;

  it('should render the container height', async () => {
    const values = await resolveTokens(testCase, 'rest', ['container.height']);
    const field = await createField(tag, outlined);

    expect(
      getPart(field, '.notched-outline').getBoundingClientRect().height,
    ).toBe(pixels(values['container.height']!));
  });

  it('should round the container corners', async () => {
    const field = await createField(tag, outlined);
    const outline = getPart(field, '.notched-outline');

    if (outlined) {
      const values = await resolveTokens(testCase, 'rest', ['container.shape']);
      const start = getComputedStyle(outline.firstElementChild!);
      const end = getComputedStyle(outline.lastElementChild!);

      expect([
        start.borderStartStartRadius,
        end.borderStartEndRadius,
        end.borderEndEndRadius,
        start.borderEndStartRadius,
      ]).toEqual(Array(4).fill(values['container.shape']));
    } else {
      const corners = [
        'container.shape.top-left',
        'container.shape.top-right',
        'container.shape.bottom-right',
        'container.shape.bottom-left',
      ];
      const values = await resolveTokens(testCase, 'rest', corners);
      const style = getComputedStyle(outline);

      expect([
        style.borderStartStartRadius,
        style.borderStartEndRadius,
        style.borderEndEndRadius,
        style.borderEndStartRadius,
      ]).toEqual(corners.map((corner) => values[corner]));
    }
  });
});

describe.each(CASES)('$tag $name populated label contract', (testCase) => {
  const { tag, outlined } = testCase;

  it('should scale the label to the populated size', async () => {
    const values = await resolveTokens(testCase, 'rest', [
      'label-text.size',
      'label-text.populated.size',
    ]);
    const field = await createField(tag, outlined);
    const label = getSlotted(field, 'label');
    const resting = label.getBoundingClientRect().height;
    field.setAttribute('value', 'Value');
    await nextFrame();

    expect(label.getBoundingClientRect().height / resting).toBe(
      pixels(values['label-text.populated.size']!) /
        pixels(values['label-text.size']!),
    );
  });

  // The populated label's line box is centred in the band of its line height
  // below the container's top padding. It fails: the label is the resting one
  // scaled, so its line box is the resting line height scaled, and not the
  // populated line height, and its centre sits above the band's. The
  // difference is reported, not yet registered.
  it.skipIf(outlined).fails(
    'should centre the populated label in its line below the top padding',
    async () => {
      const values = await resolveTokens(testCase, 'rest', [
        'container.focus.padding.block',
        'label-text.populated.line-height',
      ]);
      const field = await createField(tag, outlined, { value: 'Value' });
      const { top, bottom } = getSlotted(
        field,
        'label',
      ).getBoundingClientRect();
      const container = getPart(
        field,
        '.notched-outline',
      ).getBoundingClientRect();

      expect((top + bottom) / 2 - container.top).toBe(
        pixels(values['container.focus.padding.block']!) +
          pixels(values['label-text.populated.line-height']!) / 2,
      );
    },
  );
});
