import processTokenSet from '../../.tproc/processTokenSet.ts';
import { resolveSet } from '../../.tproc/resolve.ts';
import type { Param } from '../../.tproc/selector.ts';
import type { RenderAdjuster } from '../../.tproc/TokenPackage.ts';
import type { ExtensionCallback } from '../../.tproc/TokenPackageProcessor.ts';
import type { AppendInput, Grouper, TokenSet } from '../../.tproc/utils.ts';

export const FAB_STATES = [
  'default',
  'hovered',
  'focused',
  'pressed',
  'disabled',
] as const;

export const FAB_ALLOWED_TOKENS = [
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

function addHostParams(selector: string, params: string): string {
  return selector
    .split(',')
    .map((entry) => {
      const trimmed = entry.trim();

      if (trimmed.includes(':host(')) {
        return trimmed.replace(':host(', `:host(${params}`);
      }

      if (trimmed.includes(':host')) {
        return trimmed.replace(':host', `:host(${params})`);
      }

      return trimmed;
    })
    .join(', ');
}

export function createHostAttributeAdjuster(
  ...params: readonly Param[]
): RenderAdjuster {
  if (params.length === 0) {
    return (block) => block;
  }

  const attrs = params.join('');

  return (block) => {
    const selector = addHostParams(block.selector, attrs);

    if (selector === block.selector) {
      return block;
    }

    return { ...block, selector };
  };
}
