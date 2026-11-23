import type { ReadonlySignal } from '@preact/signals-core';
import { pseudoClass, selector, type Param } from '@ydinjs/tproc/selector.js';
import type {
  DeclarationBlockRenderer,
  TokenPackage,
} from '@ydinjs/tproc/TokenPackage.js';
import type { ExtensionCallback } from '@ydinjs/tproc/TokenPackageProcessor.js';
import type { Grouper } from '@ydinjs/tproc/utils.js';

export const SLIDER_STATES = [
  'default',
  'hover',
  'focus',
  'pressed',
  'disabled',
] as const;

const STATE_MAP: Readonly<Record<string, Param>> = {
  hover: pseudoClass('hover'),
  focus: pseudoClass('focus-visible'),
  pressed: pseudoClass('active'),
  disabled: pseudoClass('disabled'),
};

/** Deprecated upstream, under names that other states still use. */
const DEPRECATED_TOKENS: readonly string[] = [
  'hover.handle.color',
  'focus.handle.color',
  'disabled.stop-indicator.color',
];

export const groupSliderTokens: Grouper = (tokenName) => {
  if (DEPRECATED_TOKENS.includes(tokenName)) {
    return null;
  }

  const index = tokenName.indexOf('.');
  const state = tokenName.slice(0, index);

  return (SLIDER_STATES as readonly string[]).includes(state)
    ? { path: state, tokenName: tokenName.slice(index + 1) }
    : { path: 'default', tokenName };
};

export function createSliderExtensions(base?: TokenPackage): ExtensionCallback {
  return (m) => {
    const defaultState = m.state('default').extends(base?.effective('default'));

    for (const state of SLIDER_STATES) {
      if (state !== 'default') {
        m.state(state).extends(defaultState);
      }
    }
  };
}

/**
 * Declares the tokens on `.track`, which holds no slotted content, so the
 * content of the label slot doesn't inherit them.
 */
export function createSliderDeclarationRenderer(
  size?: Param,
): DeclarationBlockRenderer {
  const scope = size ? `${selector(':host', size)} ` : '';

  return (path, declarations) => ({
    path,
    declarations,
    selectors: [
      scope +
        selector(
          '.track',
          STATE_MAP[path]
            ? pseudoClass('has', selector('.input', STATE_MAP[path]))
            : null,
        ),
    ],
  });
}

export function renderSliderStylesInOrder(
  tokens: ReadonlyArray<ReadonlySignal<TokenPackage>>,
): string {
  return SLIDER_STATES.flatMap((state) =>
    tokens.map((pack) => pack.value.render({ state })),
  ).join('\n\n');
}
