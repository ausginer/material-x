import type { ReadonlySignal } from '@preact/signals-core';
import { defineBrowserCommand } from '@vitest/browser';
import type { TokenPackage } from '@ydinjs/tproc/TokenPackage.js';
import type { BrowserCommand } from 'vitest/node';

export type TokenContractRequest = Readonly<{
  contract: string;
  state: string;
  tokens: readonly string[];
}>;

export type TokenContractResponse = Readonly<{
  profile: 'expressive-web';
  contract: string;
  state: string;
  values: Readonly<Record<string, string | number>>;
}>;

type ContractRegistry = Readonly<Record<string, ReadonlySignal<TokenPackage>>>;

/*
 * The registry is built lazily. Importing a component's `styles/**\/tokens.ts`
 * pulls in tproc, whose DB performs a top-level async load; doing that at module
 * scope would initialize Material tproc for every project that merely imports
 * the browser-command map (including core). Loading on first use scopes the
 * cost to the Material X projects that actually resolve a contract.
 */
let registry: Promise<ContractRegistry> | undefined;

async function loadRegistry(): Promise<ContractRegistry> {
  const [
    size,
    def,
    elevated,
    tonal,
    outlined,
    text,
    standard,
    connected,
    checkbox,
    radio,
    slider,
    sliderSize,
    icon,
    textField,
    outlinedTextField,
    listItem,
    elevation,
    focus,
    fabColor,
    fabExtended,
    card,
    elevatedCard,
    outlinedCard,
    topAppBar,
  ] = await Promise.all([
    import('../../src/button/styles/size/tokens.ts'),
    import('../../src/button/styles/default/tokens.ts'),
    import('../../src/button/styles/elevated/tokens.ts'),
    import('../../src/button/styles/tonal/tokens.ts'),
    import('../../src/button/styles/outlined/tokens.ts'),
    import('../../src/button/styles/text/tokens.ts'),
    import('../../src/button-group/styles/standard/tokens.ts'),
    import('../../src/button-group/styles/connected/tokens.ts'),
    import('../../src/checkbox/styles/default/tokens.ts'),
    import('../../src/radio/styles/default/tokens.ts'),
    import('../../src/slider/styles/default/tokens.ts'),
    import('../../src/slider/styles/size/tokens.ts'),
    import('../../src/button/styles/icon/tokens.ts'),
    import('../../src/text-field/styles/default/tokens.ts'),
    import('../../src/text-field/styles/outlined/tokens.ts'),
    import('../../src/list/styles/item/tokens.ts'),
    import('../../src/core/styles/elevation/tokens.ts'),
    import('../../src/core/styles/focus/tokens.ts'),
    import('../../src/fab/styles/color/tokens.ts'),
    import('../../src/fab/styles/extended/tokens.ts'),
    import('../../src/card/styles/default/tokens.ts'),
    import('../../src/card/styles/elevated/tokens.ts'),
    import('../../src/card/styles/outlined/tokens.ts'),
    import('../../src/top-app-bar/styles/default/tokens.ts'),
  ]);

  // Both group token arrays are indexed by `BUTTON_GROUP_SIZES`:
  // [xsmall, small, medium, large, xlarge]. The extended FAB's array starts with
  // its small size and ends with large and medium.
  return {
    'button.size.xsmall': size.mainTokens[0]!,
    'button.size.small': size.defaultSizeMainTokens,
    'button.size.medium': size.mainTokens[1]!,
    'button.size.large': size.mainTokens[2]!,
    'button.size.xlarge': size.mainTokens[3]!,
    'button.color.filled': def.defaultFilledTokens,
    'button.color.elevated': elevated.elevatedTokens,
    'button.color.tonal': tonal.tonalTokens,
    'button.color.outlined': outlined.outlinedTokens,
    'button.color.text': text.textTokens,
    'button-group.standard.xsmall': standard.standardTokens[0]!,
    'button-group.standard.small': standard.standardTokens[1]!,
    'button-group.standard.medium': standard.standardTokens[2]!,
    'button-group.standard.large': standard.standardTokens[3]!,
    'button-group.standard.xlarge': standard.standardTokens[4]!,
    'button-group.connected.xsmall': connected.connectedTokens[0]!,
    'button-group.connected.small': connected.connectedTokens[1]!,
    'button-group.connected.medium': connected.connectedTokens[2]!,
    'button-group.connected.large': connected.connectedTokens[3]!,
    'button-group.connected.xlarge': connected.connectedTokens[4]!,
    'checkbox.default': checkbox.defaultTokens,
    'radio.default': radio.defaultTokens,
    'slider.default': slider.defaultTokens,
    'slider.size.xsmall': sliderSize.defaultSizeTokens,
    'slider.size.small': sliderSize.sizeTokens[0]!,
    'slider.size.medium': sliderSize.sizeTokens[1]!,
    'slider.size.large': sliderSize.sizeTokens[2]!,
    'slider.size.xlarge': sliderSize.sizeTokens[3]!,
    'text-field.default': textField.defaultTokens,
    'text-field.error': textField.defaultErrorTokens,
    'text-field.disabled': textField.defaultDisabledTokens,
    'text-field.outlined': outlinedTextField.outlinedTokens,
    'text-field.outlined.error': outlinedTextField.outlinedErrorTokens,
    'text-field.outlined.disabled': outlinedTextField.outlinedDisabledTokens,
    'list-item.default': listItem.listItemTokens,
    elevation: elevation.elevationTokens,
    'focus.default': focus.focusTokens,
    'fab.color.default': fabColor.defaultColorTokens,
    'fab.extended.small': fabExtended.extendedTokens[0]!,
    'fab.extended.medium': fabExtended.extendedTokens.at(-1)!,
    'fab.extended.large': fabExtended.extendedTokens.at(-2)!,
    'card.filled': card.defaultTokens,
    'card.elevated': elevatedCard.elevatedTokens,
    'card.outlined': outlinedCard.outlinedTokens,
    'top-app-bar.default': topAppBar.topAppBarTokens,
    'icon-button.color.filled':
      icon.variantTokens[icon.VARIANTS.indexOf('filled')]!,
    'icon-button.color.tonal':
      icon.variantTokens[icon.VARIANTS.indexOf('tonal')]!,
    'icon-button.color.standard':
      icon.variantTokens[icon.VARIANTS.indexOf('standard')]!,
    'switch-button.color.filled': def.defaultSwitchFilledTokens,
    'switch-button.color.elevated': elevated.elevatedSwitchTokens,
    'switch-button.color.tonal': tonal.tonalSwitchTokens,
    'switch-button.color.outlined': outlined.outlinedSwitchTokens,
    'switch-icon-button.color.filled':
      icon.variantSwitchTokens[icon.VARIANTS.indexOf('filled')]!,
    'switch-icon-button.color.tonal':
      icon.variantSwitchTokens[icon.VARIANTS.indexOf('tonal')]!,
    'switch-icon-button.color.standard':
      icon.variantSwitchTokens[icon.VARIANTS.indexOf('standard')]!,
  };
}

export async function resolveTokenContract(
  request: TokenContractRequest,
): Promise<TokenContractResponse> {
  const contracts = await (registry ??= loadRegistry());
  const tokenPackage = contracts[request.contract];

  if (!tokenPackage) {
    throw new Error(`Unknown token contract: ${request.contract}`);
  }

  const state = tokenPackage.value.effective(request.state);

  if (!state) {
    throw new Error(
      `Missing state "${request.state}" in token contract "${request.contract}"`,
    );
  }

  const values = Object.fromEntries(
    request.tokens.map((token) => {
      const value = state[token];

      if (value == null) {
        throw new Error(
          `Missing token "${token}" in state "${request.state}" of contract "${request.contract}"`,
        );
      }

      return [token, value];
    }),
  );

  return {
    profile: 'expressive-web',
    contract: request.contract,
    state: request.state,
    values,
  };
}

export const tokenContractCommands: Readonly<
  Record<string, BrowserCommand<any[]>>
> = {
  resolveTokenContract: defineBrowserCommand<[TokenContractRequest]>(
    (_context, request): Promise<TokenContractResponse> =>
      resolveTokenContract(request),
  ),
};
