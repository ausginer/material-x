import {
  groupForButtons,
  type ButtonStates,
  type PackGroup,
  type SimpleButtonStates,
} from '../utils.ts';
import motionEffects from '../../core/tokens/default/motion-effects.ts';
import { resolveSet } from '../../core/tokens/resolve.ts';
import {
  createVariables,
  type CSSVariableSet,
  type VariableOptions,
} from '../../core/tokens/variable.ts';
import processTokenSet from '../../core/tokens/processTokenSet.ts';
import { inherit } from '../../core/tokens/group.ts';

const SET_NAME = 'md.comp.button';

const PUBLIC: readonly string[] = [
  'container.color',
  'container.elevation',
  'container.height',
  'icon.color',
  'icon.size',
  'label-text.color',
  'label-text',
  'leading-space',
  'trailing-space',
];

const OPTIONS: VariableOptions = {
  public: {
    vars: PUBLIC,
    prefix: 'md-button',
  },
  allowed: [
    ...PUBLIC,
    'container.shape.round',
    'container.shape.square',
    'container.shadow-color',
    // 'focus.indicator.color',
    // 'focus.indicator.outline-offset',
    // 'focus.indicator.thickness',
    'icon-label-space',
    'state-layer.opacity',
    'state-layer.color',
    'container.opacity',
    'label-text-opacity',
    'outline-color',
  ],
};

const set = processTokenSet(SET_NAME);
const resolvedSet = resolveSet(set);
const variableSet = createVariables(resolvedSet, OPTIONS);
const groupedSet = groupForButtons(variableSet);

const {
  'container.height': containerHeight,
  'icon.size': iconSize,
  'label-text.line-height': labelTextLineHeight,
  'state-layer.color': stateLayerColor,
  'state-layer.opacity': stateLayerOpacity,
} = variableSet;

const specialTokens = createVariables(
  resolveSet({
    'state-layer.opacity': `${SET_NAME}.pressed.state-layer.opacity`,
    'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
    'padding-block': `calc((${containerHeight!.ref} - max(${iconSize!.ref}, ${labelTextLineHeight!.ref})) / 2)`,
    'press.damping': `${SET_NAME}.pressed.container.corner-size.motion.spring.damping`,
    'press.stiffness': `${SET_NAME}.pressed.container.corner-size.motion.spring.stiffness`,
    'press.duration': motionEffects['expressive.fast-effects.duration'],
    'press.factor': 0,
    'ripple.color': stateLayerColor!.ref,
    'ripple.easing': motionEffects['expressive.fast-effects'],
    'ripple.opacity': stateLayerOpacity!.ref,
  }),
  OPTIONS,
);

function buildVarPacks(
  set: ButtonStates<CSSVariableSet> | SimpleButtonStates<CSSVariableSet>,
  parent?: SimpleButtonStates<CSSVariableSet>,
): PackGroup | undefined {
  return Object.fromEntries(
    Object.entries(set).map(([group, tokens]) => {
      if (group === 'selected' || group === 'unselected') {
        return [
          group,
          buildVarPacks(tokens as SimpleButtonStates<CSSVariableSet>, set),
        ] as const;
      }

      let finalSet: CSSVariableSet | undefined;

      if (group === 'default' && !parent) {
        finalSet = {
          ...(tokens as CSSVariableSet),
          ...specialTokens,
        };
      } else {
        finalSet = inherit(
          tokens as CSSVariableSet,
          set.default,
          parent?.default,
        );
      }

      return [
        group,
        Object.entries(finalSet)
          .map(([, value]) => value.toString())
          .join('\n'),
      ] as const;
    }),
  );
}

const packs: PackGroup | undefined = buildVarPacks(groupedSet);

export default packs;
