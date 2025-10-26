import getDeep from 'just-safe-get';
import type { ProcessedTokenSet } from '../core/tokens/processTokenSet.ts';
import {
  resolveSet,
  type ResolveAdjuster,
  type ResolvedTokenSet,
} from '../core/tokens/resolve.ts';
import { pseudoClass, selector, type Param } from '../core/tokens/selector.ts';
import {
  $leaf,
  applyToShape,
  inherit,
  reshape,
  type Leaf,
  type SchemaKeys,
  type Shape,
} from '../core/tokens/shape.ts';
import { clearPrefix } from '../core/tokens/utils.ts';
import {
  CSSVariable,
  packSet,
  type CSSVariableSet,
} from '../core/tokens/variable.ts';
import { TypedObject } from '../interfaces.ts';

export type BaseButtonSchema = Readonly<{
  default: Leaf;
  hovered?: Leaf;
  focused?: Leaf;
  pressed?: Leaf;
  disabled?: Leaf;
}>;

export type ButtonSchema = BaseButtonSchema &
  Readonly<{
    selected?: BaseButtonSchema;
    unselected?: BaseButtonSchema;
  }>;

const baseButtonSchema: BaseButtonSchema = {
  default: $leaf,
  hovered: $leaf,
  focused: $leaf,
  pressed: $leaf,
  disabled: $leaf,
};

const buttonSchema: ButtonSchema = {
  ...baseButtonSchema,
  unselected: baseButtonSchema,
  selected: baseButtonSchema,
};

export const buttonStates: ReadonlyArray<keyof BaseButtonSchema> =
  TypedObject.keys(baseButtonSchema);

export type CSSVariableShape = Shape<CSSVariableSet, ButtonSchema>;

export type ProcessedSetShape = Shape<ProcessedTokenSet, ButtonSchema>;

export type ResolvedSetShape = Shape<ResolvedTokenSet, ButtonSchema>;

export function reshapeButtonSet(set: ProcessedTokenSet): ProcessedSetShape {
  return reshape(set, buttonSchema);
}

export function applyToButtons<T, U>(
  shape: Shape<T, ButtonSchema>,
  applicator: (value: T, path: ReadonlyArray<SchemaKeys<ButtonSchema>>) => U,
): Shape<U, ButtonSchema> {
  return applyToShape(shape, buttonSchema, applicator);
}

const transformShape: ResolveAdjuster = (value, path) => {
  if (path.some((p) => p.includes('container.shape')) && value === 'full') {
    return CSSVariable.ref('shape.full');
  }

  return value;
};

export function resolveButtonShape(shape: ProcessedSetShape): ResolvedSetShape {
  return applyToButtons(shape, (tokens) => resolveSet(tokens, transformShape));
}

export type ButtonPrefixData = Readonly<{
  type?: string;
  state: string;
  switchState?: string;
}>;

export function createPrefix({
  type = '',
  state,
  switchState = '',
}: ButtonPrefixData): string {
  return clearPrefix(
    `md-${type}-button-${switchState}-${state === 'default' ? '' : state}`,
  );
}

export type PackShape = Shape<string, ButtonSchema>;

function _packButtons(
  shape: CSSVariableShape,
  applicator: (
    tokens: CSSVariableSet,
    path: ReadonlyArray<SchemaKeys<ButtonSchema>>,
  ) => CSSVariableSet,
): PackShape {
  return applyToButtons(shape, (tokens, path) =>
    packSet(
      // Removing "disabled" state from "selected" & "unselected" supersets;
      // "disabled" state is supposed to be only "default" one.
      path.length > 1 && path[1] === 'disabled' ? {} : applicator(tokens, path),
    ),
  );
}

export function packButtons(
  shape: CSSVariableShape,
  ...defaultShapes: readonly CSSVariableShape[]
): PackShape {
  return _packButtons(shape, (tokens, path) => {
    const [state] = path;

    if (state === 'unselected' || state === 'selected') {
      const [, selectionState] = path;

      return state === 'unselected'
        ? inherit(tokens, CSSVariable.equals, [
            shape.default,
            selectionState !== 'default'
              ? getDeep(shape, [state, 'default'])
              : null,
            ...defaultShapes.map((s) => s.default),
          ])
        : inherit(tokens, CSSVariable.equals, [
            getDeep(shape, ['unselected', 'default']),
            selectionState !== 'default'
              ? getDeep(shape, [state, 'default'])
              : null,
          ]);
    }

    return inherit(tokens, CSSVariable.equals, [
      state === 'default' ? null : shape.default,
      ...defaultShapes.map((s) => s[state!]),
    ]);
  });
}

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
      pseudoClass('focus-visible'),
    );
  },
  pressed(...params: ReadonlyArray<Param | null | undefined>): string {
    return selector(
      ':host',
      ...params.filter((p) => p != null),
      pseudoClass('active'),
    );
  },
  disabled(...params: ReadonlyArray<Param | null | undefined>): string {
    return selector(
      ':host',
      ...params.filter((p) => p != null),
      pseudoClass('disabled'),
    );
  },
} as const;
