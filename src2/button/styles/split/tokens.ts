import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t } from '../../../.tproc/index.ts';
import type {
  RenderAdjuster,
  TokenPackage,
} from '../../../.tproc/TokenPackage.ts';
import type { Grouper } from '../../../.tproc/utils.ts';
import {
  SPLIT_ALLOWED_TOKENS,
  SPLIT_DEFAULT_TOKENS,
  createButtonExtensions,
  createVariantStateAdjuster,
  dropSelectionDisabled,
  groupButtonTokens,
} from '../utils.ts';

const SET_BASE_NAME = 'md.comp.split-button';
const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;

const skipGroup: Grouper = (tokenName) => ({
  path: 'default',
  name: `__skip.${tokenName}`,
});

export const splitDefaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_BASE_NAME)
    .group(skipGroup)
    .allowTokens(SPLIT_DEFAULT_TOKENS)
    .append({
      default: {
        'menu-button.press.easing': motionEffects['standard.fast-spatial'],
        'menu-button.press.duration':
          motionEffects['standard.fast-spatial.duration'],
      },
    })
    .build(),
);

const createPackage = (
  size: string,
  ...extraAdjusters: readonly RenderAdjuster[]
) =>
  t
    .set(`${SET_BASE_NAME}.${size}`)
    .scope('size', size)
    .group(groupButtonTokens)
    .allowTokens(SPLIT_ALLOWED_TOKENS)
    .extend(createButtonExtensions())
    .adjustRender(
      dropSelectionDisabled,
      createVariantStateAdjuster('size', size),
      ...extraAdjusters,
    )
    .build();

export const sizeTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SIZES.map((size) => computed(() => createPackage(size)));
