import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '@ydinjs/tproc/index.js';

/** The line's `color` and `thickness`, the set's only two tokens. */
export const defaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t.set('md.comp.divider').build(),
);
