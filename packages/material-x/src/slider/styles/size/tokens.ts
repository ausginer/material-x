import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '@ydinjs/tproc/index.js';
import { pseudoClass } from '@ydinjs/tproc/selector.js';
import { createAllowedTokensSelector } from '@ydinjs/tproc/utils.js';
import {
  createSliderDeclarationRenderer,
  createSliderExtensions,
  groupSliderTokens,
} from '../utils.ts';

export const SLIDER_SIZES = ['small', 'medium', 'large', 'xlarge'] as const;

type SliderSize = (typeof SLIDER_SIZES)[number];

const allowedTokensSelector = createAllowedTokensSelector([
  'active.track.height',
  'inactive.track.height',
  'active.track.shape.leading',
  'inactive.track.shape.trailing',
  'active.handle.height',
]);

const createPackage = (size: SliderSize | 'xsmall', base?: TokenPackage) =>
  t
    .set(`md.comp.slider.${size}`)
    .group(groupSliderTokens)
    .select(allowedTokensSelector)
    .extend(createSliderExtensions(base))
    .renderDeclarations(
      createSliderDeclarationRenderer(
        size === 'xsmall' ? undefined : pseudoClass('state', size),
      ),
    )
    .build();

export const defaultSizeTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage('xsmall'),
);

/** Indexed by {@link SLIDER_SIZES}. */
export const sizeTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SLIDER_SIZES.map((size) =>
    computed(() => createPackage(size, defaultSizeTokens.value)),
  );
