import processTokenSet from '../../core/tokens/processTokenSet.ts';
import { resolveSet } from '../../core/tokens/resolve.ts';
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

const SET_NAME = 'md.comp.button.text';

const ALLOWED: readonly string[] = [...PUBLIC, ...PRIVATE];

const specialTokens = createVariables(
  resolveSet({
    'container-color': 'transparent',
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
          selectionState: path.at(-2),
        }),
      },
      ALLOWED,
    ),
  );

  return applyForButtons(variableSet, (tokens, path) =>
    path[0] === 'default'
      ? {
          ...tokens,
          ...specialTokens,
        }
      : tokens,
  );
})();

const packs: PackShape = packButtons(set, defaultSet);

export default packs;
