import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
import {
  BUTTON_ALLOWED_TOKENS,
  createButtonExtensions,
  createVariantStateAdjuster,
  dropSelectionDisabled,
  fixFullShape,
  omitTokens,
} from '../utils.ts';
import { groupButtonTokens } from '../utils.ts';

const SET_NAME = 'md.comp.button.text';
const COLOR_ATTRIBUTE = 'color';
const COLOR_VALUE = 'text';

const specialTokens = {
  'container.color': 'transparent',
  'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
};

const omitSelectedShape = omitTokens(['container.shape'], (path) =>
  path.startsWith('selected.'),
);

export const textTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_NAME)
    .scope(COLOR_ATTRIBUTE, COLOR_VALUE)
    .group(groupButtonTokens)
    .allowTokens(BUTTON_ALLOWED_TOKENS)
    .adjustTokens(fixFullShape)
    .append({
      default: specialTokens,
    })
    .extend(createButtonExtensions(defaultEffectiveTokens.value))
    .adjustRender(
      dropSelectionDisabled,
      omitSelectedShape,
      createVariantStateAdjuster(COLOR_ATTRIBUTE, COLOR_VALUE),
    )
    .build(),
);
