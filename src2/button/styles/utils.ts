import type { ResolveAdjuster } from '../../.tproc/resolve.ts';
import { attribute, selector, type Param } from '../../.tproc/selector.ts';
import type { DeclarationBlockRenderer } from '../../.tproc/TokenPackage.ts';
import type { ExtensionCallback } from '../../.tproc/TokenPackageProcessor.ts';
import {
  componentStateMap,
  not,
  type GroupResult,
  type Predicate,
  type TokenSet,
} from '../../.tproc/utils.ts';
import * as CSSVariable from '../../.tproc/variable.ts';
import { disabledTokenSelector } from './default/tokens.ts';

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

export function groupButtonTokens(tokenName: string): GroupResult {
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
}

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

export const notDisabledTokenSelector: Predicate<[path: string]> = not(
  disabledTokenSelector,
);

export function buttonSwitchTokenSelector(path: string): boolean {
  return SELECTION_STATES.some((s) => path.includes(s));
}

export function buttonMainTokenSelector(path: string): boolean {
  return !buttonSwitchTokenSelector(path);
}

export function omitSelectedShape(path: string, tokenName?: string): boolean {
  if (!tokenName) {
    return true;
  }

  return !(
    path.startsWith('selected') && tokenName.startsWith('container.shape')
  );
}

const checked = attribute('checked');

export function createButtonScopedDeclarationRenderer(
  scope?: Param,
): DeclarationBlockRenderer {
  return (path, declarations) => {
    let state: string;
    let selection: string | undefined;

    const i = path.indexOf('.');
    if (i === -1) {
      state = path;
    } else {
      selection = path.slice(0, i);
      state = path.slice(i + 1);
    }

    return {
      path,
      declarations,
      selectors: [
        selector(
          ':host',
          scope,
          selection === 'selected' ? checked : null,
          path === 'default' ? null : componentStateMap[state],
        ),
      ],
    };
  };
}
