import getDeep from 'just-safe-get';
import type { TupleToUnion } from 'type-fest';
import processTokenSet from '../../../core/tokens/processTokenSet.ts';
import { inherit } from '../../../core/tokens/shape.ts';
import { createVariables, CSSVariable } from '../../../core/tokens/variable.ts';
import { set as defaultSet, PRIVATE, PUBLIC } from '../default/tokens.ts';
import {
  applyForButtons,
  createPrefix,
  packButtons,
  reshapeButtonSet,
  resolveButtonSet,
  type PackShape,
} from '../../utils.ts';

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
              selectedState: path.at(-2),
            }),
          },
          ALLOWED,
        ),
      );

      return variableSet;

      // return applyForButtons(variableSet, (tokens, path) => {
      //   // if (path[0] === 'default') {
      //   //   return {
      //   //     ...tokens,
      //   //     ...specialTokens,
      //   //   };
      //   // }

      //   // if (path[0] === 'selected' && path[1] === 'default') {
      //   //   return {
      //   //     ...tokens,
      //   //     ...selectedSpecialTokens,
      //   //   };
      //   // }

      //   return tokens;
      // });
    })();

    const pack = packButtons(set, (tokens, path) =>
      path[0] === 'default'
        ? tokens
        : inherit(tokens, CSSVariable.equals, [
            set.default,
            path.length > 1
              ? getDeep(set, [...path.slice(0, -1), 'default'])
              : null,
            defaultSet.default,
            defaultSet[path[0]!],
          ]),
    );

    return [s, pack] as const;
  }),
) as Readonly<Record<TupleToUnion<typeof SIZES>, PackShape>>;

export default packs;

// const specialTokens = createVariables(
//   resolveSet({
//     level: CSSVariable.ref('container-elevation'),
//     'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
//   }),
// );

// const selectedSpecialTokens = createVariables(
//   resolveSet({
//     'state-layer.color': `${SET_NAME}.selected.pressed.state-layer.color`,
//   }),
// );
