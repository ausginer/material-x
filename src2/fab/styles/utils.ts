import { selector, type Param } from '../../.tproc/selector.ts';
import type { DeclarationBlockRenderer } from '../../.tproc/TokenPackage.ts';
import type { ExtensionCallback } from '../../.tproc/TokenPackageProcessor.ts';
import {
  componentStateMap,
  createAllowedTokensSelector,
  type Grouper,
  type GroupSelector,
  type TokenSet,
} from '../../.tproc/utils.ts';

export const FAB_STATES = [
  'default',
  'hovered',
  'focused',
  'pressed',
  'disabled',
] as const;

export const groupFABTokens: Grouper = (tokenName) => {
  const parts = tokenName.split('.');
  let state = 'default';

  const nameParts = [];
  for (const part of parts) {
    if (FAB_STATES.includes(part)) {
      state = part;
      continue;
    }

    nameParts.push(part);
  }

  return {
    path: state,
    tokenName: nameParts.join('.'),
  };
};

export function createFABExtensions(
  base?: Readonly<Record<string, TokenSet>>,
): ExtensionCallback {
  const baseDefault = base?.['default'];
  const baseHovered = base?.['hovered'];
  const baseFocused = base?.['focused'];
  const basePressed = base?.['pressed'];
  const baseDisabled = base?.['disabled'];

  return (m) => {
    const defaultState = m.state('default').extends(baseDefault);
    m.state('hovered').extends(defaultState, baseHovered);
    m.state('focused').extends(defaultState, baseFocused);
    m.state('pressed').extends(defaultState, basePressed);
    m.state('disabled').extends(defaultState, baseDisabled);
  };
}

export const fabAllowedTokensSelector: GroupSelector =
  createAllowedTokensSelector([
    'container.width',
    'container.height',
    'container.color',
    'container.shape',
    'container.shadow-color',
    'icon.size',
    'icon.color',
    'label-text.color',
    'label-text.font-size',
    'label-text.font-name',
    'label-text.font-weight',
    'label-text.line-height',
    'direction',
    'icon-label-space',
    'gap',
    'elevation.default',
    'elevation.hovered',
    'ripple.color',
    'ripple.easing',
    'ripple.duration',
    'ripple.opacity',
    'unfold.duration',
    'unfold.easing',
    'shadow.color',
  ]);

export function createFABScopedDeclarationRenderer(
  scope?: Param | null,
  ...params: ReadonlyArray<Param | null | undefined>
): DeclarationBlockRenderer {
  return (path, declarations) => ({
    path,
    declarations,
    selectors: [
      selector(
        ':host',
        scope,
        ...params,
        path === 'default' ? null : componentStateMap[path],
      ),
    ],
  });
}
