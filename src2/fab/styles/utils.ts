import processTokenSet from '../../.tproc/processTokenSet.ts';
import { resolveSet } from '../../.tproc/resolve.ts';
import { selector, type Param } from '../../.tproc/selector.ts';
import type { DeclarationBlockRenderer } from '../../.tproc/TokenPackage.ts';
import type { ExtensionCallback } from '../../.tproc/TokenPackageProcessor.ts';
import {
  createAllowedTokensSelector,
  type AppendInput,
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

export const groupFabTokens: Grouper = (tokenName) => {
  const parts = tokenName.split('.');
  const [first] = parts;
  const isState = !!first && FAB_STATES.includes(first);
  const state = isState ? first : 'default';
  const nameParts = isState ? parts.slice(1) : parts;

  return {
    path: state,
    name: nameParts.join('.'),
  };
};

export function createFabExtensions(
  base?: Readonly<Record<string, TokenSet>>,
): ExtensionCallback {
  const baseDefault = base?.['default'];
  const baseHovered = base?.['hovered'];
  const baseFocused = base?.['focused'];
  const basePressed = base?.['pressed'];
  const baseDisabled = base?.['disabled'];

  return ({ state }) => {
    const defaultState = state('default').extends(baseDefault);
    state('hovered').extends(defaultState, baseHovered);
    state('focused').extends(defaultState, baseFocused);
    state('pressed').extends(defaultState, basePressed);
    state('disabled').extends(defaultState, baseDisabled);
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
    'state-layer.color',
    'state-layer.opacity',
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
    selectors: [selector(':host', scope, ...params)],
  });
}

export function createAppendTokens(
  setName: string,
  grouper: Grouper,
): AppendInput {
  const resolved = resolveSet(processTokenSet(setName));

  return Object.entries(resolved).reduce<
    Record<string, Record<string, string | number>>
  >((acc, [tokenName, value]) => {
    const { path, name } = grouper(tokenName);
    const key = path.length > 0 ? path : 'default';

    acc[key] ??= {};
    acc[key][name] = value;

    return acc;
  }, {});
}
