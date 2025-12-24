import motionEffects from '../../../core/tokens/default/motion-effects.ts';
import processTokenSet from '../../../core/tokens/processTokenSet.ts';
import { resolveSet } from '../../../core/tokens/resolve.ts';
import { createVariables, packSet } from '../../../core/tokens/variable.ts';
import type { FromKeys } from '../../../interfaces.ts';
import {
  applyToButtons,
  packButtons,
  reshapeButtonSet,
  resolveButtonShape,
  type PackShape,
} from '../utils.ts';

const SET_BASE_NAME = 'md.comp.split-button';
const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;

const ALLOWED = [
  'trailing-button.icon.size',
  'inner-corner.corner-size',
  'leading-button.leading-space',
  'leading-button.trailing-space',
  'trailing-button.leading-space',
  'trailing-button.trailing-space',
] as const;

export const defaults: string = packSet(
  createVariables(
    resolveSet({
      'menu-button.press.easing': motionEffects['standard.fast-spatial'],
      'menu-button.press.duration':
        motionEffects['standard.fast-spatial.duration'],
    }),
  ),
);

const packs: FromKeys<typeof SIZES, PackShape> = Object.fromEntries(
  SIZES.map((s) => {
    const set = processTokenSet(`${SET_BASE_NAME}.${s}`);
    const shapedSet = reshapeButtonSet(set);
    const resolvedSet = resolveButtonShape(shapedSet);

    const variableSet = applyToButtons(resolvedSet, (set) =>
      createVariables(set, undefined, ALLOWED),
    );

    const pack = packButtons(variableSet);

    return [s, pack] as const;
  }),
);

export default packs;
