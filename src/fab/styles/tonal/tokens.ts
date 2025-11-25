import type { TupleToUnion } from 'type-fest';
import processTokenSet from '../../../core/tokens/processTokenSet.ts';
import { resolveSet } from '../../../core/tokens/resolve.ts';
import { createVariables } from '../../../core/tokens/variable.ts';
import type { TypedObjectConstructor } from '../../../interfaces.ts';
import {
  applyToFAB,
  createPrefix,
  packFAB,
  reshapeFABSet,
  resolveFABShape,
  type PackShape,
} from '../../utils.ts';
import { PRIVATE, PUBLIC, set as defaultSet } from '../default/tokens.ts';

const COLORS = ['primary', 'secondary', 'tertiary'] as const;

const ALLOWED = [...PUBLIC, ...PRIVATE];

const packs: Readonly<Record<TupleToUnion<typeof COLORS>, PackShape>> = (
  Object as TypedObjectConstructor
).fromEntries(
  COLORS.map((c) => {
    const setName = `md.comp.fab.${c}-container`;

    const specialTokens = createVariables(
      resolveSet({
        'state-layer.color': `${setName}.pressed.state-layer.color`,
      }),
    );

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
