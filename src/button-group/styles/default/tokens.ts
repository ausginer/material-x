import type { TupleToUnion } from 'type-fest';
import { fixFullShape } from '../../../button/styles/utils.ts';
import processTokenSet, {
  type ProcessedTokenSet,
} from '../../../core/tokens/processTokenSet.ts';
import {
  resolveSet,
  type ResolvedTokenSet,
} from '../../../core/tokens/resolve.ts';
import {
  $leaf,
  applyToShape,
  reshape,
  type Leaf,
  type Shape,
} from '../../../core/tokens/shape.ts';
import {
  createVariables,
  type CSSVariable,
  type CSSVariableSet,
} from '../../../core/tokens/variable.ts';
import type { TypedObjectConstructor } from '../../../interfaces.ts';

const SET_BASE_NAME = 'md.comp.button-group';
const TYPES = ['standard', 'connected'] as const;
const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;

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

export type ButtonGroupCSSVariableShape = Shape<
  CSSVariableSet,
  ButtonGroupSchema
>;

const packs: Readonly<
  Record<
    TupleToUnion<typeof TYPES>,
    Readonly<Record<TupleToUnion<typeof SIZES>, ButtonGroupCSSVariableShape>>
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

            const resolvedSet = applyToShape(
              shapedSet,
              schema,
              (tokens: ProcessedTokenSet) => resolveSet(tokens, fixFullShape),
            );

            const variableSet = applyToShape(
              resolvedSet,
              schema,
              (set: ResolvedTokenSet) => createVariables(set),
            );

            const packedSet = applyToShape(
              variableSet,
              schema,
              (set: CSSVariableSet) => {},
            );

            return [size, ,] as const;
          }),
        ),
      ] as const,
  ),
);

export default packs;
