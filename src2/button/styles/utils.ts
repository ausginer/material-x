import type { ResolveAdjuster } from '../../.tproc/resolve.ts';
import { attribute, pseudoClass } from '../../.tproc/selector.ts';
import type { RenderAdjuster, RenderBlock } from '../../.tproc/TokenPackage.ts';
import type { ExtensionCallback } from '../../.tproc/TokenPackageProcessor.ts';
import type { Grouper, GroupResult, TokenSet } from '../../.tproc/utils.ts';
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

export const groupButtonTokens: Grouper = (tokenName: string): GroupResult => {
  const parts = tokenName.split('.');
  let selection: string | undefined;
  let state = 'default';

  const nameParts = [];
  for (const part of parts) {
    if (SELECTION_STATES.includes(part)) {
      selection = part;
      continue;
    }

    if (BUTTON_STATES.includes(part)) {
      state = part;
      continue;
    }

    nameParts.push(part);
  }

  return {
    path: selection ? `${selection}.${state}` : state,
    name: nameParts.join('.'),
  };
};

export function createButtonExtensions(
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

    const unselectedDefault = state('unselected.default').extends(
      defaultState,
      baseDefault,
    );
    state('unselected.hovered').extends(
      defaultState,
      unselectedDefault,
      baseDefault,
    );
    state('unselected.focused').extends(
      defaultState,
      unselectedDefault,
      baseDefault,
    );
    state('unselected.pressed').extends(
      defaultState,
      unselectedDefault,
      baseDefault,
    );

    const selectedDefault =
      state('selected.default').extends(unselectedDefault);
    state('selected.hovered').extends(unselectedDefault, selectedDefault);
    state('selected.focused').extends(unselectedDefault, selectedDefault);
    state('selected.pressed').extends(unselectedDefault, selectedDefault);
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
  const checkedAttr = attribute('checked');
  let { selector } = block;

  selector = selector.replaceAll(selectedState, checkedAttr);

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

export function omitTokens(
  tokens: readonly string[],
  predicate: (path: string) => boolean,
): RenderAdjuster {
  return (block) => {
    if (!predicate(block.path)) {
      return block;
    }

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
  };
}
