import {
  attribute,
  pseudoClass,
  pseudoElement,
  selector,
  type Param,
} from '../../.tproc/selector.ts';
import type { DeclarationBlockRenderer } from '../../.tproc/TokenPackage.ts';
import {
  createAllowedTokensSelector,
  type GroupResult,
  type GroupSelector,
} from '../../.tproc/utils.ts';

const STATE_NAMES = ['pressed', 'selected'] as const;

export const BUTTON_GROUP_SIZES = [
  'xsmall',
  'small',
  'medium',
  'large',
  'xlarge',
] as const;

export const BUTTON_GROUP_ALLOWED_TOKENS: readonly string[] = [
  'between-space',
  'inner-corner.corner-size',
];

export const STANDARD_ALLOWED_TOKENS: readonly string[] = [
  ...BUTTON_GROUP_ALLOWED_TOKENS,
  'interaction.easing',
  'interaction.duration',
  'interaction.width.multiplier',
];

export const CONNECTED_ALLOWED_TOKENS: readonly string[] =
  BUTTON_GROUP_ALLOWED_TOKENS;

export const CONNECTED_ALLOWED_TOKENS_WITH_SHAPE: readonly string[] = [
  ...BUTTON_GROUP_ALLOWED_TOKENS,
  'container.shape',
];

export function groupButtonGroupTokens(tokenName: string): GroupResult {
  const parts = tokenName.split('.');
  let state = 'default';
  const nameParts = [];

  for (const part of parts) {
    if (STATE_NAMES.includes(part)) {
      state = part;
      continue;
    }

    nameParts.push(part);
  }

  return {
    path: state,
    tokenName: nameParts.join('.'),
  };
}

export const standardAllowedTokensSelector: GroupSelector =
  createAllowedTokensSelector(STANDARD_ALLOWED_TOKENS);

export const connectedAllowedTokensSelector: GroupSelector =
  createAllowedTokensSelector(CONNECTED_ALLOWED_TOKENS);

export const connectedAllowedTokensWithShapeSelector: GroupSelector =
  createAllowedTokensSelector(CONNECTED_ALLOWED_TOKENS_WITH_SHAPE);

export function buttonGroupDefaultSelector(path: string): boolean {
  return path === 'default';
}

const pressedState = pseudoClass('active');
const selectedState = attribute('checked');
const slottedPressedState = pseudoElement('slotted', pressedState);
const slottedSelectedState = pseudoElement('slotted', selectedState);

type ButtonGroupRendererOptions = Readonly<{
  scope?: Param | null;
  useHostStates?: boolean;
  useSlottedStates?: boolean;
  onlyDefault?: boolean;
}>;

export function createButtonGroupDeclarationRenderer({
  scope = null,
  useHostStates,
  useSlottedStates,
  onlyDefault,
}: ButtonGroupRendererOptions): DeclarationBlockRenderer {
  const hostSelector = selector(':host', scope);

  return (path, declarations) => {
    if (onlyDefault && path !== 'default') {
      return null;
    }

    if (path === 'default') {
      return {
        path,
        declarations,
        selectors: [hostSelector],
      };
    }

    if (useHostStates) {
      const stateParam = path === 'pressed' ? pressedState : selectedState;

      return {
        path,
        declarations,
        selectors: [selector(':host', scope, stateParam)],
      };
    }

    if (useSlottedStates) {
      const stateSelector =
        path === 'pressed' ? slottedPressedState : slottedSelectedState;

      return {
        path,
        declarations,
        selectors: [`${hostSelector} ${stateSelector}`],
      };
    }

    return null;
  };
}
