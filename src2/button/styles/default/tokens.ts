import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t } from '../../../.tproc/index.ts';
import type {
  RenderAdjuster,
  TokenPackage,
} from '../../../.tproc/TokenPackage.ts';
import type { TokenValue } from '../../../.tproc/utils.ts';
import { CSSVariable } from '../../../.tproc/variable.ts';
import { groupButtonTokens } from '../utils.ts';
import { BUTTON_STATES } from '../utils.ts';
import {
  BUTTON_ALLOWED_TOKENS,
  createButtonExtensions,
  dropNonSelectionBlocks,
  dropSelectionDisabled,
  fixFullShape,
  omitTokens,
  replaceSelectionStateSelector,
} from '../utils.ts';

const SET_NAME = 'md.comp.button';

const specialTokens = {
  'state-layer.opacity': `${SET_NAME}.pressed.state-layer.opacity`,
  'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
  'press.easing': motionEffects['expressive.fast-spatial'],
  'press.duration': motionEffects['expressive.fast-spatial.duration'],
  'ripple.color': CSSVariable.ref('state-layer.color'),
  'ripple.easing': motionEffects['expressive.default-spatial'],
  'ripple.duration': motionEffects['expressive.default-spatial.duration'],
  'ripple.opacity': CSSVariable.ref('state-layer.opacity'),
  'shadow.color': CSSVariable.ref('container.shadow-color'),
};

const specialUnselectedTokens = {
  'state-layer.color': `${SET_NAME}.unselected.pressed.state-layer.color`,
  'container.color.reverse': `${SET_NAME}.selected.container.color`,
  'label-text.color.reverse': `${SET_NAME}.label-text.selected.color`,
};

const specialSelectedTokens = {
  'state-layer.color': `${SET_NAME}.selected.pressed.state-layer.color`,
};

const omitSelectedShapes = omitTokens(
  ['container.shape.round', 'container.shape.square'],
  (path) => path === 'selected.default',
);

const sharedAdjusters = [dropSelectionDisabled, omitSelectedShapes] as const;

const createPackage = (...extraAdjusters: readonly RenderAdjuster[]) =>
  t
    .set(SET_NAME)
    .group(groupButtonTokens)
    .allowTokens(BUTTON_ALLOWED_TOKENS)
    .adjustTokens(fixFullShape)
    .append({
      default: specialTokens,
      'unselected.default': specialUnselectedTokens,
      'selected.default': specialSelectedTokens,
    })
    .extend(createButtonExtensions())
    .adjustRender(...sharedAdjusters, ...extraAdjusters)
    .build();

export const defaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(),
);

export const defaultSwitchTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(dropNonSelectionBlocks, replaceSelectionStateSelector),
);

export const defaultEffectiveTokens: ReadonlySignal<
  Readonly<Record<string, Readonly<Record<string, TokenValue>>>>
> = computed(() => {
  const base = defaultTokens.value;

  return Object.fromEntries(
    BUTTON_STATES.map((state) => [state, base.effective(state) ?? {}]),
  );
});
