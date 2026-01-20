import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '../../../.tproc/index.ts';

export const focusTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set({
      'focus.indicator.outline.offset':
        'md.sys.state.focus-indicator.outer-offset',
      'focus.indicator.thickness': 'md.sys.state.focus-indicator.thickness',
      'focus.indicator.color': 'md.sys.color.secondary',
    })
    .build(),
);
