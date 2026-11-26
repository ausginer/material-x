import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '@ydinjs/tproc/default/motion-effects.js';
import { t, type TokenPackage } from '@ydinjs/tproc/index.js';
import {
  createAllowedTokensSelector,
  type GroupResult,
  type GroupSelector,
} from '@ydinjs/tproc/utils.js';

const SET_NAME = 'md.comp.list.reorder';

/** The path of the tokens that the lifted item takes. */
const LIFTED = 'lifted';

const SPECIAL_TOKENS = {
  'drag.duration': motionEffects['expressive.slow-spatial.duration'],
  'drag.easing': motionEffects['expressive.slow-spatial'],
  'layout-animation.duration':
    motionEffects['expressive.default-spatial.duration'],
  'layout-animation.easing': motionEffects['expressive.default-spatial'],
};

/**
 * A lifted item in a pointer drag. A rule of the list's tree outranks the
 * item's own `:host` rules, so it needs no place in their order of states.
 */
const LIFTED_ITEM =
  ':host(:not(:state(command))) ::slotted(:state(drag):not(:state(disabled)))';

function groupReorderTokens(name: string): GroupResult {
  const tokenName = name.slice('list-item.'.length);

  return tokenName === 'drop-zone.color'
    ? { path: 'default', tokenName }
    : {
        path: LIFTED,
        // The item's box reads its corners from this name.
        tokenName:
          tokenName === 'shape' ? 'container.expressive.shape' : tokenName,
      };
}

const allowedTokensSelector: GroupSelector = createAllowedTokensSelector([
  'container.color',
  'container.expressive.shape',
  'drop-zone.color',
  'label-text.color',
  'leading-icon.color',
  'overline.color',
  'state-layer.color',
  'state-layer.opacity',
  'supporting-text.color',
  'trailing-icon.color',
  'trailing-supporting-text.color',
]);

export const reorderTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_NAME)
    .group(groupReorderTokens)
    .select(allowedTokensSelector)
    .append('default', SPECIAL_TOKENS)
    .renderDeclarations((path, declarations) => ({
      path,
      declarations,
      selectors: [path === LIFTED ? LIFTED_ITEM : ':host'],
    }))
    .build(),
);
