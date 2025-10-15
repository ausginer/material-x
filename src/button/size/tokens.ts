import type { TupleToUnion } from 'type-fest';
import processTokenSet from '../../core/tokens/processTokenSet.ts';
import { createVariables } from '../../core/tokens/variable.ts';
import { set as defaultSet, PRIVATE, PUBLIC } from '../default/tokens.ts';
import {
  applyForButtons,
  createPrefix,
  packButtons,
  reshapeButtonSet,
  resolveButtonSet,
  type PackShape,
} from '../utils.ts';

const SIZES = ['xlarge', 'large', 'medium', 'small', 'xsmall'] as const;

const ALLOWED: readonly string[] = [...PUBLIC, ...PRIVATE];

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const packs = Object.fromEntries(
  SIZES.map((s) => {
    const set = (() => {
      const set = processTokenSet(`md.comp.button.${s}`);
      const shapedSet = reshapeButtonSet(set);
      const resolvedSet = resolveButtonSet(shapedSet);

      const variableSet = applyForButtons(resolvedSet, (set, path) =>
        createVariables(
          set,
          {
            vars: PUBLIC,
            prefix: createPrefix({
              state: path.at(-1)!,
              selectionState: path.at(-2),
            }),
          },
          ALLOWED,
        ),
      );

      return variableSet;
    })();

    const pack: PackShape = packButtons(set, defaultSet);

    return [s, pack] as const;
  }),
) as Readonly<Record<TupleToUnion<typeof SIZES>, PackShape>>;

export default packs;
