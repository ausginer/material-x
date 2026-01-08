import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t } from '../../../.tproc/index.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import { fixFullShape } from '../../../button/styles/utils.ts';
import {
  BUTTON_GROUP_SIZES,
  STANDARD_ALLOWED_TOKENS,
  createButtonGroupDeclarationRenderer,
  createHostAttributeAdjuster,
  createSlottedStateAdjuster,
  groupButtonGroupTokens,
} from '../utils.ts';

const SET_BASE_NAME = 'md.comp.button-group.standard';

const specialTokens = {
  'interaction.easing': motionEffects['expressive.fast-spatial'],
  'interaction.duration': motionEffects['expressive.fast-spatial.duration'],
  // Token table uses a LENGTH type, but the spec defines 15%.
  'interaction.width.multiplier': '0.15',
};

const createPackage = (size: (typeof BUTTON_GROUP_SIZES)[number]) => {
  const isSmall = size === 'small';
  const useSlottedStates = !isSmall;

  let processor = t
    .set(`${SET_BASE_NAME}.${size}`)
    .group(groupButtonGroupTokens)
    .allowTokens(STANDARD_ALLOWED_TOKENS)
    .adjustTokens(fixFullShape)
    .renderDeclarations(
      createButtonGroupDeclarationRenderer(
        ...(!isSmall ? [createHostAttributeAdjuster('size', size)] : []),
        ...(useSlottedStates ? [createSlottedStateAdjuster()] : []),
      ),
    );

  if (isSmall) {
    processor = processor.append({ default: specialTokens });
  }

  return processor.build();
};

export const standardTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  BUTTON_GROUP_SIZES.map((size) => computed(() => createPackage(size)));
