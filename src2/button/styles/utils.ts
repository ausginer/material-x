import type { ResolveAdjuster } from '../../.tproc/resolve.ts';
import { attribute, pseudoClass } from '../../.tproc/selector.ts';
import type { RenderAdjuster, RenderBlock } from '../../.tproc/TokenPackage.ts';
import type { ExtensionCallback } from '../../.tproc/TokenPackageProcessor.ts';
import type { GroupResult, Grouper, TokenSet } from '../../.tproc/utils.ts';
import { cssify } from '../../.tproc/utils.ts';
import { CSSVariable } from '../../.tproc/variable.ts';

export const BUTTON_STATES = [
  'default',
  'hovered',
  'focused',
  'pressed',
  'disabled',
] as const;

export const SELECTION_STATES = ['selected', 'unselected'] as const;

const BUTTON_STATE_SET = new Set<string>(BUTTON_STATES);
const SELECTION_STATE_SET = new Set<string>(SELECTION_STATES);

export const BUTTON_ALLOWED_TOKENS = [
  'container.color',
  'container.color.reverse',
  'container.elevation',
  'container.height',
  'container.opacity',
  'container.shape',
  'container.shape.round',
  'container.shape.square',
  'container.shadow-color',
  'focus.indicator.color',
  'focus.indicator.outline.offset',
  'focus.indicator.thickness',
  'icon.color',
  'icon.size',
  'icon.opacity',
  'icon-label-space',
  'label-text.color',
  'label-text.color.reverse',
  'label-text.font-name',
  'label-text.font-weight',
  'label-text.font-size',
  'label-text.line-height',
  'label-text.opacity',
  'leading-space',
  'trailing-space',
  'outline.color',
  'outline.width',
  'press.duration',
  'press.easing',
  'ripple.color',
  'ripple.duration',
  'ripple.easing',
  'ripple.opacity',
  'shadow.color',
  'state-layer.color',
  'state-layer.opacity',
  'level',
] as const;

export const SPLIT_ALLOWED_TOKENS = [
  'trailing-button.icon.size',
  'inner-corner.corner-size',
  'leading-button.leading-space',
  'leading-button.trailing-space',
  'trailing-button.leading-space',
  'trailing-button.trailing-space',
] as const;

export const ICON_WIDTH_TOKENS = ['leading-space', 'trailing-space'] as const;

export const SPLIT_DEFAULT_TOKENS = [
  'menu-button.press.easing',
  'menu-button.press.duration',
] as const;

export const groupButtonTokens: Grouper = (tokenName: string): GroupResult => {
  const parts = tokenName.split('.');
  let index = 0;
  let selection: string | undefined;
  let state = 'default';

  if (SELECTION_STATE_SET.has(parts[index] ?? '')) {
    selection = parts[index];
    index += 1;
  }

  if (BUTTON_STATE_SET.has(parts[index] ?? '')) {
    state = parts[index] ?? 'default';
    index += 1;
  }

  const name = parts.slice(index).join('.');
  const path = selection ? `${selection}.${state}` : state;

  return { path, name };
};

export function createButtonExtensions(
  base?: Readonly<Record<string, TokenSet>>,
): ExtensionCallback {
  return ({ state }) => {
    const baseDefault = base?.['default'];

    const baseHovered = base?.['hovered'];
    const baseFocused = base?.['focused'];
    const basePressed = base?.['pressed'];
    const baseDisabled = base?.['disabled'];

    const defaultState = state('default');
    defaultState.extends(baseDefault);

    const hoveredState = state('hovered');
    hoveredState.extends(defaultState, baseHovered);

    const focusedState = state('focused');
    focusedState.extends(defaultState, baseFocused);

    const pressedState = state('pressed');
    pressedState.extends(defaultState, basePressed);

    const disabledState = state('disabled');
    disabledState.extends(defaultState, baseDisabled);

    const unselectedDefault = state('unselected.default');
    unselectedDefault.extends(defaultState, baseDefault);

    const unselectedHovered = state('unselected.hovered');
    unselectedHovered.extends(defaultState, unselectedDefault, baseDefault);

    const unselectedFocused = state('unselected.focused');
    unselectedFocused.extends(defaultState, unselectedDefault, baseDefault);

    const unselectedPressed = state('unselected.pressed');
    unselectedPressed.extends(defaultState, unselectedDefault, baseDefault);

    const selectedDefault = state('selected.default');
    selectedDefault.extends(unselectedDefault);

    const selectedHovered = state('selected.hovered');
    selectedHovered.extends(unselectedDefault, selectedDefault);

    const selectedFocused = state('selected.focused');
    selectedFocused.extends(unselectedDefault, selectedDefault);

    const selectedPressed = state('selected.pressed');
    selectedPressed.extends(unselectedDefault, selectedDefault);
  };
}

export const fixFullShape: ResolveAdjuster = (value, path) => {
  if (
    path.some((entry) => entry.includes('container.shape')) &&
    value === 'full'
  ) {
    return CSSVariable.ref('shape.full');
  }

  return value;
};

export function dropSelectionDisabled(block: RenderBlock): RenderBlock | null {
  const segments = block.path.split('.');

  if (
    segments.includes('disabled') &&
    (segments.includes('selected') || segments.includes('unselected'))
  ) {
    return null;
  }

  return block;
}

export function dropNonSelectionBlocks(block: RenderBlock): RenderBlock | null {
  const segments = block.path.split('.');

  if (!segments.includes('selected') && !segments.includes('unselected')) {
    return null;
  }

  return block;
}

export function replaceSelectionStateSelector(block: RenderBlock): RenderBlock {
  const selectedState = pseudoClass('state', 'selected');
  const unselectedState = pseudoClass('state', 'unselected');
  const checkedAttr = attribute('checked');
  const notChecked = pseudoClass('not', checkedAttr);
  let { selector } = block;

  selector = selector.replaceAll(selectedState, checkedAttr);
  selector = selector.replaceAll(unselectedState, notChecked);

  if (selector === block.selector) {
    return block;
  }

  return { ...block, selector };
}

export function createVariantStateAdjuster(
  attrName: string,
  value: string,
): RenderAdjuster {
  const attrSelector = attribute(attrName, value);
  const stateSelector = `${pseudoClass('state', value)}${pseudoClass(
    'not',
    attribute(attrName),
  )}`;

  return (block) => {
    if (!block.selector.includes(attrSelector)) {
      return block;
    }

    const combined = `${block.selector}, ${block.selector.replaceAll(
      attrSelector,
      stateSelector,
    )}`;

    return { ...block, selector: combined };
  };
}

function addHostAttribute(selector: string, attrSelector: string): string {
  return selector
    .split(',')
    .map((entry) => {
      const trimmed = entry.trim();

      if (trimmed.includes(':host(')) {
        return trimmed.replace(':host(', `:host(${attrSelector}`);
      }

      if (trimmed.includes(':host')) {
        return trimmed.replace(':host', `:host(${attrSelector})`);
      }

      return trimmed;
    })
    .join(', ');
}

export function createHostAttributeAdjuster(
  attrName: string,
  value: string,
): RenderAdjuster {
  const attr = attribute(attrName, value);

  return (block) => {
    const selector = addHostAttribute(block.selector, attr);

    if (selector === block.selector) {
      return block;
    }

    return { ...block, selector };
  };
}

export function omitTokens(
  block: RenderBlock,
  tokens: readonly string[],
): RenderBlock | null {
  const remove = new Set(tokens.map((token) => `--_${cssify(token)}`));
  const lines = block.declarations.split('\n');
  const kept = lines.filter((line) => {
    const trimmed = line.trimStart();

    if (!trimmed.startsWith('--_')) {
      return true;
    }

    const [name] = trimmed.split(':', 1);
    return !remove.has(name ?? '');
  });

  if (kept.length === 0) {
    return null;
  }

  const declarations = kept.join('\n');

  if (declarations === block.declarations) {
    return block;
  }

  return { ...block, declarations };
}

export function omitTokensInPaths(
  tokens: readonly string[],
  predicate: (path: string) => boolean,
): RenderAdjuster {
  return (block) => {
    if (!predicate(block.path)) {
      return block;
    }

    return omitTokens(block, tokens);
  };
}
