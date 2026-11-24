import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '@ydinjs/tproc/default/motion-effects.js';
import { t, type TokenPackage } from '@ydinjs/tproc/index.js';
import { createAllowedTokensSelector } from '@ydinjs/tproc/utils.js';
import * as CSSVariable from '@ydinjs/tproc/variable.js';
import { focusTokens } from '../../../core/styles/focus/tokens.ts';
import { createFullShapeFix } from '../../../core/styles/utils.ts';
import {
  createSliderDeclarationRenderer,
  createSliderExtensions,
  groupSliderTokens,
} from '../utils.ts';

const SET_NAME = 'md.comp.slider';

const LABEL_TEXT = 'value-indicator.label.label-text';

const allowedTokensSelector = createAllowedTokensSelector([
  'handle.color',
  'handle.opacity',
  'handle.shape',
  'handle.width',
  'active.track.color',
  'active.track.opacity',
  'inactive.track.color',
  'inactive.track.opacity',
  'active.track.inner-corner.corner-size',
  'active.handle.leading-space',
  'active.handle.trailing-space',
  'stop-indicator.color',
  'stop-indicator.shape',
  'stop-indicator.size',
  'stop-indicator.trailing-space',
  'value-indicator.container.color',
  'value-indicator.active.bottom-space',
  `${LABEL_TEXT}.color`,
  `${LABEL_TEXT}.font`,
  `${LABEL_TEXT}.size`,
  `${LABEL_TEXT}.line-height`,
  `${LABEL_TEXT}.tracking`,
  `${LABEL_TEXT}.weight`,
]);

/** A corner of half the handle's current width. */
const fixHandleShape = createFullShapeFix(
  `calc(${CSSVariable.ref('handle.width')} / 2)`,
  (entry) => entry.endsWith('handle.shape'),
);

const fixStopIndicatorShape = createFullShapeFix(
  `calc(${CSSVariable.ref('stop-indicator.size')} / 2)`,
  (entry) => entry.endsWith('stop-indicator.shape'),
);

const specialTokens = {
  // The native thumb keeps this width in every state, so a press doesn't move
  // the handle's centre.
  'thumb.width': `${SET_NAME}.handle.width`,
  'value-indicator.duration': motionEffects['expressive.fast-effects.duration'],
  'value-indicator.easing': motionEffects['expressive.fast-effects'],
};

const disabledTokens = {
  'stop-indicator.color': `${SET_NAME}.disabled.inactive.stop-indicator.container.color`,
  // The only disabled opacity of the stop indicator is deprecated. The
  // handle's has the same value.
  'stop-indicator.opacity': `${SET_NAME}.disabled.handle.opacity`,
};

export const defaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_NAME)
    .group(groupSliderTokens)
    .select(allowedTokensSelector)
    .append('default', specialTokens)
    .append('default', focusTokens.value.effective('default')!)
    .append('disabled', disabledTokens)
    .adjustTokens(fixHandleShape, fixStopIndicatorShape)
    .extend(createSliderExtensions())
    .renderDeclarations(createSliderDeclarationRenderer())
    .build(),
);
