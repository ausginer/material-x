import type { TokenPackage } from '../../.tproc/TokenPackage.ts';
import type { ExtensionCallback } from '../../.tproc/TokenPackageProcessor.ts';
import {
  createAllowedTokensSelector,
  type Grouper,
  type GroupSelector,
} from '../../.tproc/utils.ts';
import type { Predicate } from '../../core/utils/runtime.ts';
import { not } from '../../core/utils/runtime.ts';

export const ERROR_STATE = 'error';
export const TEXT_FIELD_STATE = [
  'default',
  'hover',
  'focus',
  'disabled',
] as const;

export const textFieldAllowedTokensSelector: GroupSelector =
  createAllowedTokensSelector([
    'supporting-text.font',
    'supporting-text.weight',
    'supporting-text.size',
    'supporting-text.tracking',
    'supporting-text.line-height',
    'supporting-text.color',
    'support-text.gap',
    'container.height',
    'container.padding.inline',
    'container.icon.padding.inline',
    'container.focus.padding.block',
    'input-text.placeholder.color',
    'input-text.suffix.color',
    'input-text.prefix.color',
    'input-text.prefix.gap',
    'input-text.suffix.gap',
    'label-text.font',
    'label-text.weight',
    'label-text.size',
    'label-text.tracking',
    'label-text.line-height',
    'label-text.color',
    'caret.color',
    'trailing-icon.size',
    'trailing-icon.color',
    'leading-icon.size',
    'leading-icon.color',
    'label-text.populated.size',
    'label-text.populated.line-height',
    'input-text.font',
    'input-text.weight',
    'input-text.size',
    'input-text.tracking',
    'input-text.line-height',
    'input-text.color',
    'active-indicator.color',
    'container.shape.top-left',
    'container.shape.top-right',
    'container.shape.bottom-right',
    'container.shape.bottom-left',
    'container.color',
    'state-layer.opacity',
    'state-layer.color',
    'focus.easing',
    'focus.duration',
    'active-indicator.thickness',
    'trailing-icon.opacity',
    'leading-icon.opacity',
    'supporting-text.opacity',
    'input-text.opacity',
    'label-text.opacity',
    'active-indicator.opacity',
    'container.opacity',
  ]);
export function createTextFieldExtensions(
  ...bases: readonly TokenPackage[]
): ExtensionCallback {
  const baseDefault = bases.map((b) => b.effective('default') ?? {});
  const baseHover = bases.map((b) => b.effective('hover') ?? {});
  const baseFocus = bases.map((b) => b.effective('focus') ?? {});
  const baseDisabled = bases.map((b) => b.effective('disabled') ?? {});

  return (m) => {
    const defaultState = m.state('default').extends(...baseDefault);
    m.state('hovered').extends(defaultState, ...baseHover);
    m.state('focused').extends(defaultState, ...baseFocus);
    m.state('disabled').extends(defaultState, ...baseDisabled);

    const errorState = m.state('error').extends(defaultState);
    m.state('error.hovered').extends(defaultState, errorState);
    m.state('error.focused').extends(defaultState, errorState);
  };
}
export const groupTextFieldTokens: Grouper = (tokenName) => {
  const parts = tokenName.split('.');
  let error: string | undefined = undefined;
  let state = 'default';
  const nameParts: string[] = [];

  for (const part of parts) {
    if (part === ERROR_STATE) {
      error = ERROR_STATE;
      continue;
    }

    if (TEXT_FIELD_STATE.includes(part)) {
      state = part;
      continue;
    }

    nameParts.push(part);
  }

  return {
    path: error ? `${error}.${state}` : state,
    tokenName: nameParts.join('.'),
  };
};

export function disabledTokenSelector(path: string): boolean {
  return path === 'disabled';
}

export const notDisabledTokenSelector: Predicate<[path: string]> = not(
  disabledTokenSelector,
);

export function errorTokenSelector(path: string): boolean {
  return path.startsWith('error');
}

export const notErrorTokenSelector: Predicate<[path: string]> =
  not(errorTokenSelector);
