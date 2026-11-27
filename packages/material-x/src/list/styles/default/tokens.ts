import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '@ydinjs/tproc/index.js';
import type { ResolveAdjuster } from '@ydinjs/tproc/resolve.js';
import * as CSSVariable from '@ydinjs/tproc/variable.js';
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
