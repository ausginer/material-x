import type { TupleToUnion } from 'type-fest';
import processTokenSet from '../../../core/tokens/processTokenSet.ts';
import { resolveSet } from '../../../core/tokens/resolve.ts';
import { attribute, type Param } from '../../../core/tokens/selector.ts';
import {
  createVariables,
  CSSVariable,
  type CSSVariableSet,
} from '../../../core/tokens/variable.ts';
import type { FromKeys } from '../../../interfaces.ts';
import {
  applyToFAB,
  createPrefix,
  packFAB,
  reshapeFABSet,
  resolveFABShape,
  type PackShape,
} from '../../utils.ts';
import { set as defaultSet, PRIVATE, PUBLIC } from '../default/tokens.ts';

export const DEFAULTS = ['tertiary', 'small', 'tertiary-container'] as const;

const COLORS = ['primary', 'secondary'] as const;
const TONAL_COLORS = ['primary-container', 'secondary-container'] as const;
const SIZES = ['large', 'medium'] as const;

const VARIANTS: readonly [
  'tertiary',
  'small',
  'tertiary-container',
  'primary',
  'secondary',
  'primary-container',
  'secondary-container',
  'large',
  'medium',
] = [...DEFAULTS, ...COLORS, ...TONAL_COLORS, ...SIZES] as const;

export function variantAttribute(
  variant: TupleToUnion<typeof VARIANTS>,
): readonly Param[] {
  if ((COLORS as readonly string[]).includes(variant)) {
    return [attribute('color', variant)];
  }

  if ((TONAL_COLORS as readonly string[]).includes(variant)) {
    return [
      attribute('tonal'),
      attribute('color', variant.replace('-container', '')),
    ];
  }

  if ((SIZES as readonly string[]).includes(variant)) {
    return [attribute('size', variant)];
  }

  return [];
}

const ALLOWED = [...PUBLIC, ...PRIVATE, 'icon-label-space'];

const packs: FromKeys<typeof VARIANTS, PackShape> = Object.fromEntries(
  VARIANTS.map((c) => {
    const setName = `md.comp.extended-fab.${c}`;

    let specialTokens: CSSVariableSet = {};

    if (c === 'tertiary') {
      specialTokens = createVariables(
        resolveSet({
          'state-layer.color': `${setName}.pressed.state-layer.color`,
          direction: 'row',
          'container.width': CSSVariable.ref('container.height'),
        }),
        {
          vars: ['direction'],
          prefix: createPrefix({
            type: 'extended',
            state: 'default',
          }),
        },
      );
    }

    const set = (() => {
      const set = processTokenSet(setName);
      const shapedSet = reshapeFABSet(set);
      const resolvedSet = resolveFABShape(shapedSet);

      const variableSet = applyToFAB(resolvedSet, (set, [state]) =>
        createVariables(
          set,
          {
            vars: PUBLIC,
            prefix: createPrefix({
              type: 'extended',
              state: state!,
            }),
          },
          ALLOWED,
        ),
      );

      return applyToFAB(variableSet, (tokens, [state]) => {
        if (state === 'default') {
          return {
            ...tokens,
            ...specialTokens,
          };
        }

        return tokens;
      });
    })();

    const pack = packFAB(set, defaultSet);

    return [c, pack] as const;
  }),
);

export default packs;
