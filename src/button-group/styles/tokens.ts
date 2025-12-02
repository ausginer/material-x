import type { TupleToUnion } from 'type-fest';
import { fixFullShape } from '../../button/styles/utils.ts';
import motionEffects from '../../core/tokens/default/motion-effects.ts';
import processTokenSet from '../../core/tokens/processTokenSet.ts';
import { resolveSet } from '../../core/tokens/resolve.ts';
import {
  attribute,
  pseudoClass,
  pseudoElement,
} from '../../core/tokens/selector.ts';
import {
  $leaf,
  applyToShape,
  reshape,
  type Leaf,
  type Shape,
} from '../../core/tokens/shape.ts';
import { excludeFromSet } from '../../core/tokens/utils.ts';
import { createVariables, packSet } from '../../core/tokens/variable.ts';
import type { TypedObjectConstructor } from '../../interfaces.ts';

const SET_BASE_NAME = 'md.comp.button-group';
const TYPES = ['standard', 'connected'] as const;
const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;

const ALLOWED = [
  'container.height',
  'between-space',
  'inner-corner.corner-size',
];

export type ButtonGroupSchema = Readonly<{
  default: Leaf;
  pressed?: Leaf;
  selected?: Leaf;
}>;

const schema: ButtonGroupSchema = {
  default: $leaf,
  pressed: $leaf,
  selected: $leaf,
};

export type ButtonGroupShape<T> = Shape<T, ButtonGroupSchema>;

function applyToButtonGroup<T, U>(
  shape: ButtonGroupShape<T>,
  applicator: (set: T, path: readonly string[]) => U,
): ButtonGroupShape<U> {
  return applyToShape(shape, schema, applicator);
}

const special = createVariables(
  resolveSet({
    'interaction.easing': motionEffects['expressive.fast-spatial'],
    'interaction.duration': motionEffects['expressive.fast-spatial.duration'],
    // Original value in token table is of type LENGTH which usually used as a
    // pixel value but at https://m3.material.io/components/button-groups/specs
    // it is defined as 15%. So, to avoid further issues, let's have it defined
    // here explicitly.
    'interaction.width.multiplier': '0.15',
  }),
);

const specialConnecteed = createVariables(
  resolveSet(
    {
      'container.shape': `${SET_BASE_NAME}.connected.small.container.shape`,
      'between-space': `${SET_BASE_NAME}.connected.small.between-space`,
    },
    fixFullShape,
  ),
);

const packs: Readonly<
  Record<
    TupleToUnion<typeof TYPES>,
    Readonly<Record<TupleToUnion<typeof SIZES>, ButtonGroupShape<string>>>
  >
> = (Object as TypedObjectConstructor).fromEntries(
  TYPES.map(
    (type) =>
      [
        type,
        (Object as TypedObjectConstructor).fromEntries(
          SIZES.map((size) => {
            const set = processTokenSet(`${SET_BASE_NAME}.${type}.${size}`);
            const shapedSet = reshape(set, schema);

            const resolvedSet = applyToButtonGroup(shapedSet, (tokens) =>
              resolveSet(tokens, fixFullShape),
            );

            const variableSet = applyToButtonGroup(resolvedSet, (set) =>
              createVariables(set, undefined, ALLOWED),
            );

            const specializedSet = applyToButtonGroup(
              variableSet,
              (set, path) => {
                if (size === 'small' && path[0] === 'default') {
                  if (type === 'connected') {
                    return {
                      ...set,
                      ...specialConnecteed,
                    };
                  } else {
                    return {
                      ...set,
                      ...special,
                    };
                  }
                }

                if (type === 'connected') {
                  return excludeFromSet(set, ['between-space']);
                }

                return set;
              },
            );

            const packedSet = applyToButtonGroup(specializedSet, (set) =>
              packSet(set),
            );

            return [size, packedSet] as const;
          }),
        ),
      ] as const,
  ),
);

export const state = {
  pressed(): string {
    return pseudoElement('slotted', pseudoClass('active'));
  },
  selected(): string {
    return pseudoElement('slotted', attribute('checked'));
  },
} as const;

export const buttonGroupStates = ['default', 'pressed', 'selected'] as const;

export default packs;
