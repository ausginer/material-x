import { computed, type ReadonlySignal } from '@preact/signals-core';
import type { TupleToUnion } from 'type-fest';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t } from '../../../.tproc/index.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import {
  createAllowedTokensSelector,
  createDefaultFirstSorter,
  type ProcessorAdjuster,
} from '../../../.tproc/utils.ts';
import {
  buttonMainTokenSelector,
  createButtonExtensions,
  createButtonScopedDeclarationRenderer,
  fixFullShape,
  groupButtonTokens,
} from '../utils.ts';

const SET_BASE_NAME = 'md.comp.split-button';
const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;
type Sizes = TupleToUnion<typeof SIZES>;

export const splitDefaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set({
      'menu-button.press.easing': motionEffects['standard.fast-spatial'],
      'menu-button.press.duration':
        motionEffects['standard.fast-spatial.duration'],
    })
    .build(),
);

const sizeAllowedTokensSelector = createAllowedTokensSelector([
  'trailing-button.icon.size',
  'inner-corner.corner-size',
  'leading-button.leading-space',
  'leading-button.trailing-space',
  'trailing-button.leading-space',
  'trailing-button.trailing-space',
]);

function isDefaultSize(size: Sizes) {
  return size === 'small';
}

const createPackage = (
  size: Sizes,
  adjuster: ProcessorAdjuster = (processor) => processor,
) =>
  adjuster(
    t
      .set(`${SET_BASE_NAME}.${size}`)
      .group(groupButtonTokens)
      .select(sizeAllowedTokensSelector)
      .extend(createButtonExtensions())
      .adjustTokens(fixFullShape)
      .renderDeclarations(
        createButtonScopedDeclarationRenderer(
          isDefaultSize(size)
            ? undefined
            : {
                name: 'size',
                value: size,
                useState: true,
              },
        ),
      ),
  ).build();

export const sizeTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SIZES.toSorted(createDefaultFirstSorter(isDefaultSize)).map((size) =>
    computed(() =>
      createPackage(size, (processor) =>
        processor.select(buttonMainTokenSelector),
      ),
    ),
  );
