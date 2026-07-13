import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '@ydinjs/tproc/default/motion-effects.js';
import { t } from '@ydinjs/tproc/index.js';
import { pseudoClass } from '@ydinjs/tproc/selector.js';
import type { TokenPackage } from '@ydinjs/tproc/TokenPackage.js';
import type { ProcessorAdjuster } from '@ydinjs/tproc/utils.js';
import { fixFullShape } from '../../../button/styles/utils.ts';
import {
  BUTTON_GROUP_SIZES,
  createButtonGroupDeclarationRenderer,
  groupButtonGroupTokens,
  standardAllowedTokensSelector,
} from '../utils.ts';

const SET_BASE_NAME = 'md.comp.button-group.standard';

const specialTokens = {
  'interaction.easing': motionEffects['expressive.fast-spatial'],
  'interaction.duration': motionEffects['expressive.fast-spatial.duration'],
  // Token table uses a LENGTH type, but the spec defines 15%.
  'interaction.width.multiplier': '0.15',
};

const createPackage = (
  size: (typeof BUTTON_GROUP_SIZES)[number],
  adjuster: ProcessorAdjuster = (processor) => processor,
) => {
  const isSmall = size === 'small';
  const useSlottedStates = !isSmall;

  let processor = adjuster(
    t
      .set(`${SET_BASE_NAME}.${size}`)
      .group(groupButtonGroupTokens)
      .select(standardAllowedTokensSelector)
      .adjustTokens(fixFullShape)
      .renderDeclarations(
        createButtonGroupDeclarationRenderer({
          scope: isSmall ? null : pseudoClass('state', size),
          useHostStates: isSmall,
          useSlottedStates,
        }),
      ),
  );

  if (isSmall) {
    processor = processor.append('default', specialTokens);
  }

  return processor.build();
};

export const standardTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  BUTTON_GROUP_SIZES.map((size) => computed(() => createPackage(size)));
