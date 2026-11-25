import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '@ydinjs/tproc/default/motion-effects.js';
import { t, type TokenPackage } from '@ydinjs/tproc/index.js';
import { pseudoClass, selector } from '@ydinjs/tproc/selector.js';
import type { DeclarationBlockRenderer } from '@ydinjs/tproc/TokenPackage.js';
import {
  createAllowedTokensSelector,
  type Grouper,
  type GroupSelector,
  type TokenSet,
} from '@ydinjs/tproc/utils.js';

const ON_SCROLL = 'on-scroll.';

const SPECIAL_TOKENS: TokenSet = {
  'container.height': 'md.comp.app-bar.small.container.height',
  'title.font': 'md.comp.app-bar.small.title.font',
  // No token gives these two. The small app bar's measurements at
  // https://m3.material.io/components/app-bars/specs show the first. The
  // second is the headline's inset in the medium app bar there, because the
  // small one shows no figure for an empty slot.
  'between-space': '4px',
  'headline.space': '16px',
  'scroll.duration': motionEffects['expressive.default-effects.duration'],
  'scroll.easing': motionEffects['expressive.default-effects'],
};

const groupTokens: Grouper = (tokenName) =>
  tokenName.startsWith(ON_SCROLL)
    ? { path: 'scrolled', tokenName: tokenName.slice(ON_SCROLL.length) }
    : { path: 'default', tokenName };

const allowedTokens: GroupSelector = createAllowedTokensSelector([
  'container.color',
  'container.shape',
  'icon.size',
  'icon-button-space',
  'leading-icon.color',
  'leading-space',
  'title.color',
  'trailing-icon.color',
  'trailing-space',
]);

const renderer: DeclarationBlockRenderer = (path, declarations) => ({
  path,
  declarations,
  selectors: [
    selector(
      ':host',
      path === 'scrolled' ? pseudoClass('state', 'scrolled') : null,
    ),
  ],
});

export const topAppBarTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set('md.comp.app-bar')
    .group(groupTokens)
    .select(allowedTokens)
    .append('default', SPECIAL_TOKENS)
    .renderDeclarations(renderer)
    .build(),
);
