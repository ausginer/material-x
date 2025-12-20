import type { ProcessedTokenSet } from '../core/tokens/processTokenSet.ts';
import { resolveSet, type ResolvedTokenSet } from '../core/tokens/resolve.ts';
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

export type FABSchema = Readonly<{
  default: Leaf;
  hovered?: Leaf;
  focused?: Leaf;
  pressed?: Leaf;
  disabled?: Leaf;
}>;

export const fabSchema: FABSchema = {
  default: $leaf,
  hovered: $leaf,
  focused: $leaf,
  pressed: $leaf,
  disabled: $leaf,
} as const;

export const fabStates: ReadonlyArray<keyof FABSchema> = Object.keys(fabSchema);

export type CSSVariableShape = Shape<CSSVariableSet, FABSchema>;
export type ProcessedSetShape = Shape<ProcessedTokenSet, FABSchema>;
export type ResolvedSetShape = Shape<ResolvedTokenSet, FABSchema>;

export function reshapeFABSet(set: ProcessedTokenSet): ProcessedSetShape {
  return reshape(set, fabSchema);
}

export function applyToFAB<T, U>(
  shape: Shape<T, FABSchema>,
  applicator: (value: T, path: ReadonlyArray<SchemaKeys<FABSchema>>) => U,
): Shape<U, FABSchema> {
  return applyToShape(shape, fabSchema, applicator);
}

export function resolveFABShape(shape: ProcessedSetShape): ResolvedSetShape {
  return applyToFAB(shape, (tokens) => resolveSet(tokens));
}

export type FABPrefixData = Readonly<{
  state: string;
  type?: string;
}>;

export function createPrefix({ state, type = '' }: FABPrefixData): string {
  return clearPrefix(`md-${type}-fab-${state === 'default' ? '' : state}`);
}

export type PackShape = Shape<string, FABSchema>;

export function packFAB(
  shape: CSSVariableShape,
  defaultShape?: CSSVariableShape,
): PackShape {
  return applyToFAB(shape, (tokens, [state]) =>
    packSet(
      inherit(tokens, CSSVariable.equals, [
        state === 'default' ? null : shape.default,
        defaultShape?.[state!],
      ]),
    ),
  );
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
