import processTokenSet from '../../core/tokens/processTokenSet.ts';
import { resolveSet } from '../../core/tokens/resolve.ts';
import { excludeFromSet } from '../../core/tokens/utils.ts';
import { createVariables } from '../../core/tokens/variable.ts';
import { set as defaultSet, PRIVATE, PUBLIC } from '../default/tokens.ts';
import {
  applyToButtons,
  createPrefix,
  packButtons,
  reshapeButtonSet,
  resolveButtonShape,
  type PackShape,
} from '../utils.ts';

const SET_NAME = 'md.comp.button.outlined';

const ALLOWED: readonly string[] = [...PUBLIC, ...PRIVATE];

const specialTokens = createVariables(
  resolveSet({
    'container.color': 'transparent',
    'outline-width': '1px',
    'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
  }),
);

const specialSelectedTokens = createVariables(
  resolveSet({
    'state-layer.color': `${SET_NAME}.selected.pressed.state-layer.color`,
  }),
);

const set = (() => {
  const set = processTokenSet(SET_NAME);
  const shapedSet = reshapeButtonSet(set);
  const resolvedSet = resolveButtonShape(shapedSet);

  const variableSet = applyToButtons(resolvedSet, (set, path) =>
    createVariables(
      set,
      {
        vars: PUBLIC,
        prefix: createPrefix({
          type: 'outlined',
          state: path.at(-1)!,
          switchState: path.at(-2),
        }),
      },
      ALLOWED,
    ),
  );

  return applyToButtons(variableSet, (tokens, path) => {
    if (path[0] === 'default') {
      return {
        ...tokens,
        ...specialTokens,
      };
    }

    if (path[0] === 'selected') {
      const prepared = excludeFromSet(tokens, ['container.shape']);

      if (path[1] === 'default') {
        return {
          ...prepared,
          ...specialSelectedTokens,
        };
      }

      return prepared;
    }

    return tokens;
  });
})();

const packs: PackShape = packButtons(set, defaultSet);

export default packs;
