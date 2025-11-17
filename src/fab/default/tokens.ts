import motionEffects from '../../core/tokens/default/motion-effects.ts';
import processTokenSet from '../../core/tokens/processTokenSet.ts';
import { resolveSet } from '../../core/tokens/resolve.ts';
import { createVariables, CSSVariable } from '../../core/tokens/variable.ts';
import {
  applyToFAB,
  createPrefix,
  packFAB,
  reshapeFABSet,
  resolveFABShape,
  type CSSVariableShape,
  type PackShape,
} from '../utils.ts';

const SET_NAME_GENERAL = 'md.comp.fab';
const SET_NAME_TERTIARY = 'md.comp.fab.tertiary';

export const PUBLIC: readonly string[] = [
  'container.width',
  'container.height',
  'container.color',
  'icon.size',
  'icon.color',
  'label-text.color',
  'label-text.font-size',
  'label-text.font-name',
  'label-text.font-weight',
  'label-text.line-height',
  'direction',
];

export const PRIVATE: readonly string[] = [
  'container.shape',
  'container.shadow-color',
  'state-layer.color',
  'state-layer.opacity',
];

const ALLOWED: readonly string[] = [...PUBLIC, ...PRIVATE];

const specialTokens = createVariables(
  resolveSet({
    gap: `${SET_NAME_TERTIARY}.icon-label.space`,
    'elevation.default': `${SET_NAME_TERTIARY}.container.elevation`,
    'elevation.hovered': `${SET_NAME_TERTIARY}.hovered.container.elevation`,
    'state-layer.color': `${SET_NAME_TERTIARY}.pressed.state-layer.color`,
    'state-layer.opacity': `${SET_NAME_TERTIARY}.pressed.state-layer.opacity`,
    'press-factor': 0,
    'unfold-factor': 0,
    level: `calc(
      ${CSSVariable.ref('elevation.default')} +
        (${CSSVariable.ref('elevation.hovered')} - ${CSSVariable.ref('elevation.default')}) *
        ${CSSVariable.ref('press-factor')}
    )`,
    'press-damping': 'md.sys.motion.spring.fast.spatial.damping',
    'press-stiffness': 'md.sys.motion.spring.fast.spatial.stiffness',
    'press-duration': motionEffects['expressive.fast-effects.duration'],
    'ripple-color': CSSVariable.ref('state-layer.color'),
    'ripple-easing': motionEffects['expressive.fast-effects'],
    'ripple-opacity': CSSVariable.ref('state-layer.opacity'),
    'unfold-duration': motionEffects['expressive.fast-effects.duration'],
    'unfold-damping': 'md.sys.motion.spring.fast.effects.damping',
    'unfold-stiffness': 'md.sys.motion.spring.fast.effects.stiffness',
    'shadow.color': CSSVariable.ref('container.shadow-color'),
  }),
  {
    vars: ['elevation.default', 'elevation.hovered'],
    prefix: createPrefix({
      state: 'default',
    }),
  },
);

export const set: CSSVariableShape = (() => {
  const set = {
    ...processTokenSet(SET_NAME_GENERAL),
    ...processTokenSet(SET_NAME_TERTIARY),
  };

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

const packs: PackShape = packFAB(set);

export default packs;
