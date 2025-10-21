import type { TupleToUnion } from 'type-fest';
import processTokenSet from '../../core/tokens/processTokenSet.ts';
import { excludeFromSet } from '../../core/tokens/utils.ts';
import { createVariables } from '../../core/tokens/variable.ts';
import { TypedObject, type UnionAsObject } from '../../interfaces.ts';
import { set as defaultSet, PRIVATE, PUBLIC } from '../default/tokens.ts';
import {
  applyToButtons,
  createPrefix,
  packButtons,
  reshapeButtonSet,
  resolveButtonShape,
  type PackShape,
} from '../utils.ts';

const SIZES = ['xlarge', 'large', 'medium', 'small', 'xsmall'] as const;

const ALLOWED: readonly string[] = [...PUBLIC, ...PRIVATE];

const packs: UnionAsObject<
  TupleToUnion<typeof SIZES>,
  PackShape
> = TypedObject.fromEntries(
  SIZES.map((s) => {
    const set = (() => {
      const set = processTokenSet(`md.comp.button.${s}`);
      const shapedSet = reshapeButtonSet(set);
      const resolvedSet = resolveButtonShape(shapedSet);

      const variableSet = applyToButtons(resolvedSet, (set, path) =>
        createVariables(
          set,
          {
            vars: PUBLIC,
            prefix: createPrefix({
              type: s,
              state: path.at(-1)!,
              switchState: path.at(-2),
            }),
          },
          ALLOWED,
        ),
      );

      return applyToButtons(variableSet, (tokens, [state]) => {
        if (state === 'selected') {
          return excludeFromSet(tokens, ['container.shape']);
        }

        return tokens;
      });
    })();

    const pack = packButtons(set, defaultSet);

    return [s, pack] as const;
  }),
);

export default packs;
