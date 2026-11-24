import { pseudoClass, selector } from '@ydinjs/tproc/selector.js';
import type { DeclarationBlockRenderer } from '@ydinjs/tproc/TokenPackage.js';
import {
  createAllowedTokensSelector,
  type Grouper,
  type GroupSelector,
} from '@ydinjs/tproc/utils.js';

/** Upstream's name for each interaction state, and the state's path. */
const STATES: Readonly<Record<string, string>> = {
  hover: 'hovered',
  focus: 'focused',
  pressed: 'pressed',
  dragged: 'dragged',
  disabled: 'disabled',
};

export const groupCardTokens: Grouper = (tokenName) => {
  const [first, ...rest] = tokenName.split('.');
  const state = STATES[first!];

  return state
    ? { path: state, tokenName: rest.join('.') }
    : { path: 'default', tokenName };
};

export const enabledTokenSelector: GroupSelector = (path) => path === 'default';

export const cardAllowedTokensSelector: GroupSelector =
  createAllowedTokensSelector([
    'container.color',
    'container.elevation',
    'container.shadow-color',
    'container.shape',
    'outline.color',
    'outline.width',
  ]);

export function createCardDeclarationRenderer(
  variant?: string,
): DeclarationBlockRenderer {
  return (path, declarations) => ({
    path,
    declarations,
    selectors: [
      selector(':host', variant ? pseudoClass('state', variant) : null),
    ],
  });
}
