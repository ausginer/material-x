import { computed, type ReadonlySignal } from '@preact/signals-core';
import type { TupleToUnion } from 'type-fest';
import { t } from '../../../.tproc/index.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import type { GroupSelector } from '../../../.tproc/utils.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
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

const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;
type Sizes = TupleToUnion<typeof SIZES>;

function isDefaultSize(size: Sizes): boolean {
  return size === 'small';
}

const createPackage = (
  size: Sizes,
  ...groupSelectors: readonly GroupSelector[]
) =>
  t
    .set(`md.comp.button.${size}`)
    .group(groupButtonTokens)
    .select(...groupSelectors, buttonAllowedTokensSelector)
    .adjustTokens(fixFullShape)
    .extend(createButtonExtensions(defaultEffectiveTokens.value))
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
    )
    .build();

export const defaultSizeMainTokens: ReadonlySignal<TokenPackage> = computed(
  () => createPackage('small', buttonMainTokenSelector),
);

export const defaultSizeSwitchTokens: ReadonlySignal<TokenPackage> = computed(
  () =>
    createPackage(
      'small',
      buttonSwitchTokenSelector,
      notDisabledTokenSelector,
      omitSelectedShape,
    ),
);

export const mainTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SIZES.filter((s) => s === 'small').map((size) =>
    computed(() => createPackage(size, buttonMainTokenSelector)),
  );

export const switchTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SIZES.map((size) =>
    computed(() =>
      createPackage(
        size,
        buttonSwitchTokenSelector,
        notDisabledTokenSelector,
        omitSelectedShape,
      ),
    ),
  );
