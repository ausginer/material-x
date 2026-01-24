import type { ReadonlySignal } from '@preact/signals-core';
import { pseudoClass, selector, type Param } from '../../.tproc/selector.ts';
import type {
  DeclarationBlockRenderer,
  TokenPackage,
} from '../../.tproc/TokenPackage.ts';
import type { ExtensionCallback } from '../../.tproc/TokenPackageProcessor.ts';
import {
  createAllowedTokensSelector,
  type Grouper,
  type GroupSelector,
} from '../../.tproc/utils.ts';
import type { Predicate } from '../../core/utils/runtime.ts';
import { not } from '../../core/utils/runtime.ts';

export const TEXT_FIELD_STATES = [
  'default',
  'hover',
  'focus',
  'disabled',
] as const;
const ERROR_STATE = [null, 'error'];

const TEXT_FIELD_STATE_MAP: Readonly<Record<string, Param>> = {
  hover: pseudoClass('hover'),
  focus: pseudoClass('focus-within'),
  disabled: pseudoClass('disabled'),
};

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
    m.state('hover').extends(defaultState, ...baseHover);
    m.state('focus').extends(defaultState, ...baseFocus);
    m.state('disabled').extends(defaultState, ...baseDisabled);

    const errorState = m.state('error').extends(defaultState);
    m.state('error.hover').extends(defaultState, errorState);
    m.state('error.focus').extends(defaultState, errorState);
  };
}
export const groupTextFieldTokens: Grouper = (tokenName) => {
  const parts = tokenName.split('.');
  let error: string | undefined = undefined;
  let state = 'default';
  const nameParts: string[] = [];

  for (const part of parts) {
    if (part === 'error') {
      error = 'error';
      continue;
    }

    if (TEXT_FIELD_STATES.includes(part)) {
      state = part;
      continue;
    }

    nameParts.push(part);
  }

  const newTokenName = nameParts.join('.');

  return {
    path: error ? `${error}.${state}` : state,
    tokenName:
      newTokenName === 'active-indicator.height'
        ? 'active-indicator.thickness'
        : newTokenName,
  };
};

const ALLOWED_DISABLED_TOKENS = [
  'container.color',
  'container.opacity',
  'label-text.color',
  'label-text.opacity',
];

export function disabledTokenSelector(
  path: string,
  tokenName?: string,
): boolean {
  return path === 'disabled' && ALLOWED_DISABLED_TOKENS.includes(tokenName);
}

export const notDisabledTokenSelector: Predicate<
  [path: string, tokenName?: string]
> = not(disabledTokenSelector);

export function errorTokenSelector(path: string): boolean {
  return path.startsWith('error');
}

export const notErrorTokenSelector: Predicate<[path: string]> =
  not(errorTokenSelector);

export function createTextFieldScopedDeclarationRenderer(
  scope?: Param | null,
): DeclarationBlockRenderer {
  return (path, declarations) => {
    let state: string;
    let error: string | undefined;

    const index = path.indexOf('.');
    if (index < 0) {
      state = path;
    } else {
      error = path.slice(0, index);
      state = path.slice(index + 1);
    }

    return {
      path,
      declarations,
      selectors: [
        selector(
          ':host',
          scope,
          error ? pseudoClass('state', error) : null,
          state === 'default' ? null : TEXT_FIELD_STATE_MAP[state],
        ),
      ],
    };
  };
}

export function renderTextFieldStylesInOrder(
  tokens: ReadonlyArray<ReadonlySignal<TokenPackage>>,
): string {
  return ERROR_STATE.flatMap((error) =>
    TEXT_FIELD_STATES.flatMap((state) =>
      tokens.map((pack) =>
        pack.value.render({ state: error ? `${error}.${state}` : state }),
      ),
    ),
  ).join('\n\n');
}
