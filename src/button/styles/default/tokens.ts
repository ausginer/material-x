import motionEffects from '../../../core/tokens/default/motion-effects.ts';
import processTokenSet from '../../../core/tokens/processTokenSet.ts';
import { resolveSet } from '../../../core/tokens/resolve.ts';
import { excludeFromSet } from '../../../core/tokens/utils.ts';
import { createVariables, CSSVariable } from '../../../core/tokens/variable.ts';
import {
  applyToButtons,
  createPrefix,
  packButtons,
  reshapeButtonSet,
  resolveButtonShape,
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
  'focus.indicator.outline.offset',
  'focus.indicator.thickness',
  'icon-label-space',
  'icon.opacity',
  'state-layer.opacity',
  'state-layer.color',
  'container.opacity',
  'label-text.opacity',
  'outline.color',
];

const ALLOWED: readonly string[] = [...PUBLIC, ...PRIVATE];

const specialTokens = createVariables(
  resolveSet({
    'state-layer.opacity': `${SET_NAME}.pressed.state-layer.opacity`,
    'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
    'padding-block': `calc((${CSSVariable.ref('container.height')} - max(${CSSVariable.ref('icon.size')}, ${CSSVariable.ref('label-text.line-height')})) / 2)`,
    'press.easing': motionEffects['expressive.fast-spatial'],
    'press.duration': motionEffects['expressive.fast-spatial.duration'],
    'ripple.color': CSSVariable.ref('state-layer.color'),
    'ripple.easing': motionEffects['expressive.fast-spatial'],
    'ripple.opacity': CSSVariable.ref('state-layer.opacity'),
    'shadow.color': CSSVariable.ref('container.shadow-color'),
    'shape.full': `calc(${CSSVariable.ref('container.height')} / 2)`,
    'interaction.factor': 0,
  }),
);

const specialPressedTokens = createVariables(
  resolveSet({
    'interaction.factor': 1,
  }),
);

const specialUnselectedTokens = createVariables(
  resolveSet({
    'state-layer.color': `${SET_NAME}.unselected.pressed.state-layer.color`,
    'container.color.reverse': `${SET_NAME}.selected.container.color`,
    'label-text.color.reverse': `${SET_NAME}.label-text.selected.color`,
  }),
);

const specialSelectedTokens = createVariables(
  resolveSet({
    'state-layer.color': `${SET_NAME}.selected.pressed.state-layer.color`,
    'interaction.factor': 1,
  }),
);

const specialSelectedPressedTokens = createVariables(
  resolveSet({
    'interaction.factor': 0,
  }),
);

export const set: CSSVariableShape = (() => {
  const set = processTokenSet(SET_NAME);
  const shapedSet = reshapeButtonSet(set);
  const resolvedSet = resolveButtonShape(shapedSet);

  const variableSet = applyToButtons(resolvedSet, (set, path) =>
    createVariables(
      set,
      {
        vars: PUBLIC,
        prefix: createPrefix({
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

    if (path[0] === 'pressed') {
      return {
        ...tokens,
        ...specialPressedTokens,
      };
    }

    if (path[1] === 'default') {
      if (path[0] === 'unselected') {
        return {
          ...tokens,
          ...specialUnselectedTokens,
        };
      }

      if (path[0] === 'selected') {
        return {
          ...excludeFromSet(tokens, [
            'container.shape.square',
            'container.shape.round',
            'container.color',
            'label-text.color',
          ]),
          ...specialSelectedTokens,
        };
      }
    }

    // Remove label & container colors for hovered/focused/pressed to avoid
    // conflicts with dynamically changing colors.
    if (path[0] === 'selected') {
      let _tokens = excludeFromSet(tokens, [
        'container.color',
        'label-text.color',
      ]);

      if (path[1] === 'pressed') {
        _tokens = {
          ..._tokens,
          ...specialSelectedPressedTokens,
        };
      }

      return _tokens;
    }

    return tokens;
  });
})();

const packs: PackShape = packButtons(set);

export default packs;
