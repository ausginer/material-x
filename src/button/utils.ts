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
  type SchemaKeys,
  type Shape,
} from '../core/tokens/shape.ts';
import {
  CSSVariable,
  packSet,
  type CSSVariableSet,
} from '../core/tokens/variable.ts';

export type BaseButtonSchema = Readonly<{
  default: typeof $leaf;
  hovered?: typeof $leaf;
  focused?: typeof $leaf;
  pressed?: typeof $leaf;
  disabled?: typeof $leaf;
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

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
export const buttonStates = Object.keys(baseButtonSchema) as ReadonlyArray<
  keyof BaseButtonSchema
>;

export type CSSVariableShape = Shape<CSSVariableSet, ButtonSchema>;

export type ProcessedSetShape = Shape<ProcessedTokenSet, ButtonSchema>;

export type ResolvedSetShape = Shape<ResolvedTokenSet, ButtonSchema>;

export function reshapeButtonSet(set: ProcessedTokenSet): ProcessedSetShape {
  return reshape(set, buttonSchema);
}

export function applyForButtons<T, U>(
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

export function resolveButtonSet(shape: ProcessedSetShape): ResolvedSetShape {
  return applyForButtons(shape, (tokens) => resolveSet(tokens, transformShape));
}

export type ButtonPrefixData = Readonly<{
  state: string;
  type?: string;
  selectionState?: string;
}>;

export function createPrefix({
  state,
  type,
  selectionState,
}: ButtonPrefixData): string {
  return `md-${type ? `${type}-` : ''}button-${selectionState ? `${selectionState}-` : ''}${state}`;
}

export type PackShape = Shape<string, ButtonSchema>;

function _packButtons(
  set: CSSVariableShape,
  applicator: (
    tokens: CSSVariableSet,
    path: ReadonlyArray<SchemaKeys<ButtonSchema>>,
  ) => CSSVariableSet,
): PackShape {
  return applyForButtons(set, (tokens, path) =>
    packSet(
      // Removing "disabled" state from "selected" & "unselected" supersets;
      // "disabled" state is supposed to be only "default" one.
      path.length > 1 && path[1] === 'disabled' ? {} : applicator(tokens, path),
    ),
  );
}

export function packButtons(
  set: CSSVariableShape,
  defaultSet?: CSSVariableShape,
): PackShape {
  return _packButtons(set, (tokens, path) => {
    const [state] = path;

    if (state === 'unselected' || state === 'selected') {
      const [, selectionState] = path;

      return state === 'unselected'
        ? inherit(tokens, CSSVariable.equals, [
            set.default,
            selectionState !== 'default'
              ? getDeep(set, [state, 'default'])
              : null,
            defaultSet?.default,
          ])
        : inherit(tokens, CSSVariable.equals, [
            getDeep(set, ['unselected', 'default']),
            selectionState !== 'default'
              ? getDeep(set, [state, 'default'])
              : null,
          ]);
    }

    return state === 'default'
      ? tokens
      : inherit(tokens, CSSVariable.equals, [
          set.default,
          defaultSet?.[state!],
        ]);
  });
}

export const state = {
  default(...params: readonly Param[]): string {
    return selector(':host', ...params);
  },
  hovered(...params: readonly Param[]): string {
    return selector(':host', ...params, pseudoClass('hover'));
  },
  focused(...params: readonly Param[]): string {
    return selector(':host', ...params, pseudoClass('focus-visible'));
  },
  pressed(...params: readonly Param[]): string {
    return selector(':host', ...params, pseudoClass('active'));
  },
  disabled(...params: readonly Param[]): string {
    return selector(':host', ...params, pseudoClass('disabled'));
  },
} as const;
