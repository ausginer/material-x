import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t } from '../../../.tproc/index.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import type { ProcessorAdjuster } from '../../../.tproc/utils.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';
import {
  buttonAllowedTokensSelector,
  buttonMainTokenSelector,
  buttonSwitchTokenSelector,
  createButtonExtensions,
  createButtonScopedDeclarationRenderer,
  fixFullShape,
  groupButtonTokens,
  notDisabledTokenSelector,
  omitSelectedShape,
} from '../utils.ts';

const GENERAL_SET_NAME = 'md.comp.button';
const FILLED_SET_NAME = 'md.comp.button.filled';

type Sets = typeof GENERAL_SET_NAME | typeof FILLED_SET_NAME;

const specialTokens = {
  'state-layer.opacity': `${GENERAL_SET_NAME}.pressed.state-layer.opacity`,
  'state-layer.color': `${GENERAL_SET_NAME}.pressed.state-layer.color`,
  'press.easing': motionEffects['expressive.fast-spatial'],
  'press.duration': motionEffects['expressive.fast-spatial.duration'],
  'ripple.color': CSSVariable.ref('state-layer.color'),
  'ripple.easing': motionEffects['expressive.default-spatial'],
  'ripple.duration': motionEffects['expressive.default-spatial.duration'],
  'ripple.opacity': CSSVariable.ref('state-layer.opacity'),
  'shadow.color': CSSVariable.ref('container.shadow-color'),
};

const specialUnselectedTokens = {
  'state-layer.color': `${GENERAL_SET_NAME}.unselected.pressed.state-layer.color`,
  'container.color.reverse': `${GENERAL_SET_NAME}.selected.container.color`,
  'label-text.color.reverse': `${GENERAL_SET_NAME}.label-text.selected.color`,
};

const specialSelectedTokens = {
  'state-layer.color': `${GENERAL_SET_NAME}.selected.pressed.state-layer.color`,
};

export function disabledTokenSelector(path: string): boolean {
  return path === 'disabled';
}

const renderer = createButtonScopedDeclarationRenderer();

const createPackage = (
  set: Sets,
  adjuster: ProcessorAdjuster = (processor) => processor,
) =>
  adjuster(
    t
      .set(set)
      .group(groupButtonTokens)
      .select(buttonAllowedTokensSelector)
      .adjustTokens(fixFullShape)
      .renderDeclarations(renderer),
  ).build();

export const defaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(GENERAL_SET_NAME, (processor) =>
    processor
      .select(buttonMainTokenSelector, notDisabledTokenSelector)
      .append('default', specialTokens)
      .extend(createButtonExtensions()),
  ),
);

export const defaultFilledTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(FILLED_SET_NAME, (processor) =>
    processor
      .select(buttonMainTokenSelector, notDisabledTokenSelector)
      .extend(createButtonExtensions(defaultTokens.value)),
  ),
);

export const defaultSwitchTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(GENERAL_SET_NAME, (processor) =>
    processor
      .select(
        buttonSwitchTokenSelector,
        notDisabledTokenSelector,
        omitSelectedShape,
      )
      .append('unselected.default', specialUnselectedTokens)
      .append('selected.default', specialSelectedTokens)
      .extend(createButtonExtensions()),
  ),
);

export const defaultSwitchFilledTokens: ReadonlySignal<TokenPackage> = computed(
  () =>
    createPackage(FILLED_SET_NAME, (processor) =>
      processor
        .select(
          buttonSwitchTokenSelector,
          notDisabledTokenSelector,
          omitSelectedShape,
        )
        .extend(
          createButtonExtensions(
            defaultTokens.value,
            defaultFilledTokens.value,
            defaultSwitchTokens.value,
          ),
        ),
    ),
);

export const disabledTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(GENERAL_SET_NAME, (processor) =>
    processor
      .select(disabledTokenSelector)
      .extend(createButtonExtensions(defaultTokens.value)),
  ),
);
