import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import type { ResolveAdjuster } from '../../../.tproc/resolve.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';
import { createFullShapeFix } from '../../../core/styles/utils.ts';
import { groupListTokens, listAllowedTokensSelector } from '../utils.ts';

const SET_NAME = 'md.comp.list';

const fixFullShape: ResolveAdjuster = createFullShapeFix(
  CSSVariable.ref('shape.full'),
  (entry) => entry.includes('shape'),
);

export const listTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_NAME)
    .group(groupListTokens)
    .select(listAllowedTokensSelector)
    .adjustTokens(fixFullShape)
    .build(),
);
