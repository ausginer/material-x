import type { TupleToUnion } from 'type-fest';
import processTokenSet from '../../../core/tokens/processTokenSet.ts';
import { resolveSet } from '../../../core/tokens/resolve.ts';
import { attribute, type Param } from '../../../core/tokens/selector.ts';
import { createVariables } from '../../../core/tokens/variable.ts';
import type { TypedObjectConstructor } from '../../../interfaces.ts';
import { set as defaultSet, PRIVATE, PUBLIC } from '../default/tokens.ts';
import {
  applyToButtons,
  createPrefix,
  packButtons,
  reshapeButtonSet,
  resolveButtonShape,
  type PackShape,
} from '../utils.ts';

export const DEFAULTS = ['small', 'filled'] as const;
export const COLORS = ['tonal', 'standard'] as const;
export const SIZES = ['large', 'medium', 'xlarge', 'xsmall'] as const;

export const VARIANTS: readonly [
  'small',
  'filled',
  'tonal',
  'standard',
  'large',
  'medium',
  'xlarge',
  'xsmall',
] = [...DEFAULTS, ...COLORS, ...SIZES] as const;

const ALLOWED = [...PUBLIC, ...PRIVATE] as const;

export function variantAttribute(variant: string): readonly Param[] {
  if ((COLORS as readonly string[]).includes(variant)) {
    return [attribute('color', variant)];
  }

  if ((SIZES as readonly string[]).includes(variant)) {
    return [attribute('size', variant)];
  }

  return [];
}

const packs: Readonly<Record<TupleToUnion<typeof VARIANTS>, PackShape>> = (
  Object as TypedObjectConstructor
).fromEntries(
  VARIANTS.map((c) => {
    const setName = `md.comp.icon-button.${c}`;

    const specialTokens = createVariables(
      resolveSet({
        ...(c === 'standard' ? { 'container-color': 'transparent' } : {}),
        'state-layer.color': `${setName}.pressed.state-layer.color`,
      }),
    );

    const specialUnselectedTokens = createVariables(
      resolveSet({
        'state-layer.color': `${setName}.unselected.pressed.state-layer.color`,
      }),
    );

    const specialSelectedTokens = createVariables(
      resolveSet({
        'state-layer.color': `${setName}.selected.pressed.state-layer.color`,
      }),
    );

    const set = (() => {
      const set = processTokenSet(setName);

      const shapedSet = reshapeButtonSet(set);
      const resolvedSet = resolveButtonShape(shapedSet);

      const variableSet = applyToButtons(resolvedSet, (set, path) =>
        createVariables(
          set,
          {
            vars: PUBLIC,
            prefix: createPrefix({
              type: 'icon',
              state: path.at(-1)!,
              switchState: path.at(-2),
            }),
          },
          ALLOWED,
        ),
      );

      return applyToButtons(variableSet, (tokens, path) => {
        if (path[0] === 'default') {
          return { ...tokens, ...specialTokens };
        }

        if (path[1] === 'default') {
          if (path[0] === 'unselected') {
            return {
              ...tokens,
              ...specialUnselectedTokens,
            };
          }

          if (path[0] === 'selected') {
            return {
              ...tokens,
              ...specialSelectedTokens,
            };
          }
        }

        return tokens;
      });
    })();

    const pack = packButtons(set, defaultSet);

    return [c, pack];
  }),
);

const WIDTHS = ['wide', 'narrow'] as const;
const WIDTH_PUBLIC = ['leading-space', 'trailing-space'] as const;

export const widthPacks: Readonly<
  Record<
    TupleToUnion<typeof WIDTHS>,
    Readonly<Record<TupleToUnion<typeof SIZES>, PackShape>>
  >
> = (Object as TypedObjectConstructor).fromEntries(
  WIDTHS.map((w) => {
    const result = (Object as TypedObjectConstructor).fromEntries(
      SIZES.map((s) => {
        const setName = `md.comp.icon-button.${s}`;

        const set = (() => {
          const set = processTokenSet(setName);
          const shapedSet = reshapeButtonSet(set);
          const resolvedSet = resolveButtonShape(shapedSet);

          const transformedSet = applyToButtons(resolvedSet, (tokens) => {
            return (Object as TypedObjectConstructor).fromEntries(
              (Object as TypedObjectConstructor)
                .entries(tokens)
                .filter(([key]) => key.includes(w))
                .map(([key, value]) => [key.replace(`${w}.`, ''), value]),
            );
          });

          return applyToButtons(transformedSet, (set, path) =>
            createVariables(set, {
              vars: WIDTH_PUBLIC,
              prefix: createPrefix({
                type: 'icon',
                state: path.at(-1)!,
                switchState: path.at(-2),
              }),
            }),
          );
        })();

        const pack = packButtons(set, defaultSet);

        return [s, pack] as const;
      }),
    );

    return [w, result] as const;
  }),
);

export default packs;
