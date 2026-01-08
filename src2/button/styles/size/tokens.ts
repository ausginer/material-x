import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
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

const baseTokens = defaultEffectiveTokens;

const createPackage = (
  size: string,
  ...groupSelectors: readonly GroupSelector[]
) =>
  t
    .set(`md.comp.button.${size}`)
    .group(groupButtonTokens)
    .select(...groupSelectors, buttonAllowedTokensSelector)
    .adjustTokens(fixFullShape)
    .extend(createButtonExtensions(baseTokens.value))
    .renderDeclarations(
      createButtonScopedDeclarationRenderer(attribute('size', size)),
    )
    .build();

export const mainTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SIZES.map((size) =>
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
