import getDeep from 'just-safe-get';
import motionEffects from '../../core/tokens/default/motion-effects.ts';
import processTokenSet from '../../core/tokens/processTokenSet.ts';
import { resolveSet } from '../../core/tokens/resolve.ts';
import { inherit } from '../../core/tokens/shape.ts';
import { createVariables, CSSVariable } from '../../core/tokens/variable.ts';
import {
  applyForButtons,
  createPrefix,
  packButtons,
  reshapeButtonSet,
  resolveButtonSet,
  type CSSVariableShape,
  type PackShape,
} from '../utils.ts';

const SET_NAME = 'md.comp.button';

export const PUBLIC: readonly string[] = [
  'container.color',
  'container.elevation',
  'container.height',
  'icon.color',
  'icon.size',
  'label-text.color',
  'label-text.font-name',
  'label-text.font-weight',
  'label-text.font-size',
  'label-text.line-height',
  'leading-space',
  'trailing-space',
];

export const PRIVATE: readonly string[] = [
  'container.shape.round',
  'container.shape.square',
  'container.shadow-color',
  'focus.indicator.color',
  'focus.indicator.outline-offset',
  'focus.indicator.thickness',
  'icon-label-space',
  'state-layer.opacity',
  'state-layer.color',
  'container.opacity',
  'label-text-opacity',
  'outline-color',
];

const ALLOWED: readonly string[] = [...PUBLIC, ...PRIVATE];

const specialTokens = createVariables(
  resolveSet({
    'state-layer.opacity': `${SET_NAME}.pressed.state-layer.opacity`,
    'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
    'padding-block': `calc((${CSSVariable.ref('container.height')} - max(${CSSVariable.ref('icon.size')}, ${CSSVariable.ref('label-text.line-height')})) / 2)`,
    'press.damping': `${SET_NAME}.pressed.container.corner-size.motion.spring.damping`,
    'press.stiffness': `${SET_NAME}.pressed.container.corner-size.motion.spring.stiffness`,
    'press.duration': motionEffects['expressive.fast-effects.duration'],
    'press.factor': 0,
    'ripple.color': CSSVariable.ref('state-layer.color'),
    'ripple.easing': motionEffects['expressive.fast-effects'],
    'ripple.opacity': CSSVariable.ref('state-layer.opacity'),
  }),
);

const specialSelectedTokens = createVariables(
  resolveSet({
    'state-layer.color': `${SET_NAME}.selected.pressed.state-layer.color`,
  }),
);

export const set: CSSVariableShape = (() => {
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

    if (path[0] === 'selected' && path[1] === 'default') {
      return {
        ...tokens,
        ...specialSelectedTokens,
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
      ]),
);

export default packs;
