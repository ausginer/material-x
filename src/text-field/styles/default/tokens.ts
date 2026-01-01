import motionEffects from '../../../core/tokens/default/motion-effects.ts';
import processTokenSet from '../../../core/tokens/processTokenSet.ts';
import { resolveSet } from '../../../core/tokens/resolve.ts';
import {
  pseudoClass,
  selector,
  type Param,
} from '../../../core/tokens/selector.ts';
import {
  $leaf,
  applyToShape,
  inherit,
  reshape,
  type Leaf,
  type Shape,
} from '../../../core/tokens/shape.ts';
import {
  createVariables,
  CSSVariable,
  packSet,
} from '../../../core/tokens/variable.ts';
import type { FromKeys } from '../../../interfaces.ts';

const TYPES = ['filled', 'outlined'] as const;

// const PUBLIC = [
//   'supporting-text.font',
//   'supporting-text.size',
//   'supporting-text.color',
//   'label-text.font',
//   'label-text.size',
// ];

const PRIVATE = [
  'supporting-text.font',
  'supporting-text.weight',
  'supporting-text.size',
  'supporting-text.tracking',
  'supporting-text.line-height',
  'supporting-text.color',
  'container.height',
  'input-text.placeholder.color',
  'input-text.suffix.color',
  'input-text.prefix.color',
  'label-text.font',
  'label-text.weight',
  'label-text.size',
  'label-text.tracking',
  'label-text.line-height',
  'label-text.color',
  'caret.color',
  'trailing-icon.size',
  'trailing-icon.color',
  'leading-icon.size',
  'leading-icon.color',
  'label-text.populated.size',
  'label-text.populated.line-height',
  'input-text.font',
  'input-text.weight',
  'input-text.size',
  'input-text.tracking',
  'input-text.line-height',
  'input-text.color',
  'active-indicator.color',
  'container.shape.top-left',
  'container.shape.top-right',
  'container.shape.bottom-right',
  'container.shape.bottom-left',
  'container.color',
  'state-layer.opacity',
  'state-layer.color',
  'active-indicator.thickness',
  'trailing-icon.opacity',
  'leading-icon.opacity',
  'supporting-text.opacity',
  'input-text.opacity',
  'label-text.opacity',
  'active-indicator.opacity',
  'container.opacity',
];

const ALLOWED = PRIVATE;

export type TextFieldSchema = Readonly<{
  default: Leaf;
  hover?: Leaf;
  focus?: Leaf;
  disabled?: Leaf;
  error?: {
    default: Leaf;
    hover?: Leaf;
    focus?: Leaf;
  };
}>;

const schema: TextFieldSchema = {
  default: $leaf,
  hover: $leaf,
  focus: $leaf,
  disabled: $leaf,
  error: {
    default: $leaf,
    hover: $leaf,
    focus: $leaf,
  },
};

type PackShape = Shape<string, TextFieldSchema>;

export type TextFieldShape<T> = Shape<T, TextFieldSchema>;

function applyToTextField<T, U>(
  shape: TextFieldShape<T>,
  applicator: (set: T, path: readonly string[]) => U,
): TextFieldShape<U> {
  return applyToShape(shape, schema, applicator);
}

// While there are no tokens for the sizes in this set, they are defined in the
// measurements section of https://m3.material.io/components/text-fields/specs.
const specialFilled = createVariables(
  resolveSet({
    'container.icon.padding.inline': '12px',
    'container.padding.inline': '16px',
    'support-text.gap': '4px',
    'container.focus.padding.block': '8px',
    'input-text.prefix.gap': '2px',
    'input-text.suffix.gap': '2px',
    'focus.easing': motionEffects['expressive.fast-spatial'],
    'focus.duration': motionEffects['expressive.fast-spatial.duration'],
    // It looks like there is some misalignment in token names since
    // active-indicator.height is apparently active-indicator.thickness but they
    // coexist. So here we rename it to active-indicator.thickness to have them
    // aligned.
    'active-indicator.thickness':
      'md.comp.filled-text-field.active-indicator.height',
  }),
);

const packs: FromKeys<typeof TYPES, PackShape> = Object.fromEntries(
  TYPES.map((type) => {
    const setName = `md.comp.${type}-text-field`;
    const set = processTokenSet(setName);
    const shapedSet = reshape(set, schema);
    const resolvedSet = applyToTextField(shapedSet, (tokens) =>
      resolveSet(tokens),
    );
    const variableSet = applyToTextField(resolvedSet, (set) =>
      createVariables(set, undefined, ALLOWED),
    );

    const specializedSet = applyToTextField(variableSet, (set, path) => {
      if (type === 'filled' && path[0] === 'default') {
        return {
          ...set,
          ...specialFilled,
        };
      }

      return set;
    });

    const packedSet = applyToTextField(specializedSet, (set, path) => {
      let _set = set;

      if (path[0] !== 'default') {
        _set = inherit(_set, CSSVariable.equals, [specializedSet.default]);
      }

      if (path[0] === 'error' && path[1] !== 'default') {
        _set = inherit(_set, CSSVariable.equals, [
          specializedSet.error?.default,
        ]);
      }

      return packSet(_set);
    });

    return [type, packedSet];
  }),
);

export const state = {
  default(...params: ReadonlyArray<Param | null | undefined>): string {
    return selector(':host', ...params.filter((p) => p != null));
  },
  hovered(...params: ReadonlyArray<Param | null | undefined>): string {
    return selector(
      ':host',
      ...params.filter((p) => p != null),
      pseudoClass('hover'),
    );
  },
  focused(...params: ReadonlyArray<Param | null | undefined>): string {
    return selector(
      ':host',
      ...params.filter((p) => p != null),
      pseudoClass('focus-within'),
    );
  },
  disabled(...params: ReadonlyArray<Param | null | undefined>): string {
    return selector(
      ':host',
      ...params.filter((p) => p != null),
      pseudoClass('disabled'),
    );
  },
  error(...params: ReadonlyArray<Param | null | undefined>): string {
    return selector(
      ':host',
      ...params.filter((p) => p != null),
      pseudoClass('state', 'error'),
    );
  },
} as const;

export const textFieldStates = [
  'default',
  'hovered',
  'focused',
  'disabled',
  'error',
] as const;

export default packs;
