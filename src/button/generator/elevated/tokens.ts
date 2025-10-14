import getDeep from 'just-safe-get';
import processTokenSet from '../../../core/tokens/processTokenSet.ts';
import { resolveSet } from '../../../core/tokens/resolve.ts';
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

const SET_NAME = 'md.comp.button.elevated';

const ALLOWED: readonly string[] = [...PUBLIC, ...PRIVATE];

const specialTokens = createVariables(
  resolveSet({
    level: CSSVariable.ref('container-elevation'),
    'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
  }),
);

const set = (() => {
  const set = processTokenSet(SET_NAME);
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

  return applyForButtons(variableSet, (tokens, path) => {
    if (path[0] === 'default') {
      return {
        ...tokens,
        ...specialTokens,
      };
    }
    return tokens;
  });
})();

const packs: PackShape = packButtons(set, (tokens, path) =>
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

export default packs;
