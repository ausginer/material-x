import type { ProcessedTokenValue } from '../../.tproc/processTokenSet.ts';
import { attribute, pseudoClass, selector } from '../../.tproc/selector.ts';
import type {
  DeclarationBlockRenderer,
  TokenPackage,
} from '../../.tproc/TokenPackage.ts';
import type { ExtensionCallback } from '../../.tproc/TokenPackageProcessor.ts';
import {
  componentStateMap,
  createAllowedTokensSelector,
  not,
  type GroupResult,
  type GroupSelector,
  type Predicate,
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
    tokenName: nameParts.join('.'),
  };
}

export function createButtonExtensions(
  ...bases: readonly TokenPackage[]
): ExtensionCallback {
  const baseDefault = bases.map((b) => b.effective('default') ?? {});
  const baseHovered = bases.map((b) => b.effective('hovered') ?? {});
  const baseFocused = bases.map((b) => b.effective('focused') ?? {});
  const basePressed = bases.map((b) => b.effective('pressed') ?? {});
  const baseDisabled = bases.map((b) => b.effective('disabled') ?? {});

  return (m) => {
    const defaultState = m.state('default').extends(...baseDefault);
    m.state('hovered').extends(defaultState, ...baseHovered);
    m.state('focused').extends(defaultState, ...baseFocused);
    m.state('pressed').extends(defaultState, ...basePressed);
    m.state('disabled').extends(defaultState, ...baseDisabled);

    const unselectedDefault = m
      .state('unselected.default')
      .extends(defaultState, ...baseDefault);
    m.state('unselected.hovered').extends(
      defaultState,
      unselectedDefault,
      ...baseDefault,
    );
    m.state('unselected.focused').extends(
      defaultState,
      unselectedDefault,
      ...baseDefault,
    );
    m.state('unselected.pressed').extends(
      defaultState,
      unselectedDefault,
      ...baseDefault,
    );

    const selectedDefault = m
      .state('selected.default')
      .extends(unselectedDefault);
    m.state('selected.hovered').extends(unselectedDefault, selectedDefault);
    m.state('selected.focused').extends(unselectedDefault, selectedDefault);
    m.state('selected.pressed').extends(unselectedDefault, selectedDefault);
  };
}

export function fixFullShape(
  value: ProcessedTokenValue,
  path: readonly string[],
): ProcessedTokenValue | null {
  if (
    path.some((entry) => entry.includes('container.shape')) &&
    value === 'full'
  ) {
    return CSSVariable.ref('shape.full');
  }

  return value;
}

export const buttonAllowedTokensSelector: GroupSelector =
  createAllowedTokensSelector([
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
    'label-text',
    'label-text.color',
    'label-text.color.reverse',
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
  ]);

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

export type ButtonScope = Readonly<{
  name: string;
  value: string;
  useState?: boolean;
}>;

export function createButtonScopedDeclarationRenderer(
  scope?: ButtonScope,
): DeclarationBlockRenderer {
  return (path, declarations) => {
    let state: string;
    let selection: string | undefined;

    const index = path.indexOf('.');
    if (index < 0) {
      state = path;
    } else {
      selection = path.slice(0, index);
      state = path.slice(index + 1);
    }

    const scopeAttribute = scope
      ? attribute(scope.name, scope.value)
      : undefined;

    const scopeState = scope?.useState
      ? [
          pseudoClass('state', scope.value),
          pseudoClass('not', attribute(scope.name)),
        ]
      : [];

    const commonParams = [
      selection === 'selected' ? checked : null,
      path === 'default' ? null : componentStateMap[state],
    ];

    return {
      path,
      declarations,
      selectors: [
        selector(':host', scopeAttribute, ...commonParams),
        scope?.useState
          ? selector(':host', ...scopeState, ...commonParams)
          : null,
      ],
    };
  };
}
