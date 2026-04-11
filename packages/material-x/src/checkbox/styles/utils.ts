import type { ReadonlySignal } from '@preact/signals-core';
import {
  attribute,
  pseudoClass,
  selector,
  type Param,
} from '../../.tproc/selector.ts';
import type {
  DeclarationBlockRenderer,
  TokenPackage,
} from '../../.tproc/TokenPackage.ts';
import type { ExtensionCallback } from '../../.tproc/TokenPackageProcessor.ts';
import {
  createAllowedTokensSelector,
  type GroupResult,
  type GroupSelector,
} from '../../.tproc/utils.ts';
import {
  disabledTokenSelector,
  notDisabledTokenSelector,
} from '../../core/styles/utils.ts';

export const CHECKBOX_STATES = [
  'default',
  'hover',
  'focus',
  'pressed',
  'disabled',
] as const;

export const SELECTION_STATES = ['unselected', 'selected'] as const;

const STATE_MAP: Readonly<Record<string, Param>> = {
  hover: pseudoClass('hover'),
  focus: pseudoClass('focus-within'),
  pressed: pseudoClass('active'),
  disabled: pseudoClass('disabled'),
};

export function groupTokens(tokenName: string): GroupResult | null {
  const parts = tokenName.split('.');
  let selection: string | undefined;
  let state = 'default';
  const nameParts: string[] = [];

  for (const part of parts) {
    if (part === 'error') {
      return null;
    }

    if (SELECTION_STATES.includes(part)) {
      selection = part;
      continue;
    }

    if (CHECKBOX_STATES.includes(part)) {
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

export { disabledTokenSelector, notDisabledTokenSelector };

export function createExtensions(): ExtensionCallback {
  return (m) => {
    const defaultState = m.state('default').extends();
    m.state('hover').extends(defaultState);
    m.state('focus').extends(defaultState);
    m.state('pressed').extends(defaultState);
    m.state('disabled').extends(defaultState);

    const unselectedDefault = m
      .state('unselected.default')
      .extends(defaultState);
    m.state('unselected.hover').extends(defaultState, unselectedDefault);
    m.state('unselected.focus').extends(defaultState, unselectedDefault);
    m.state('unselected.pressed').extends(defaultState, unselectedDefault);

    const selectedDefault = m
      .state('selected.default')
      .extends(defaultState, unselectedDefault);
    m.state('selected.hover').extends(
      defaultState,
      unselectedDefault,
      selectedDefault,
    );
    m.state('selected.focus').extends(
      defaultState,
      unselectedDefault,
      selectedDefault,
    );
    m.state('selected.pressed').extends(
      defaultState,
      unselectedDefault,
      selectedDefault,
    );
  };
}

export const allowedTokensSelector: GroupSelector = createAllowedTokensSelector(
  [
    'container.color',
    'container.shape',
    'container.size',
    'container.opacity',
    'state-layer.color',
    'state-layer.opacity',
    'state-layer.shape',
    'state-layer.size',
  ],
);

const checked = attribute('checked');
const indeterminate = attribute('indeterminate');

export function createScopedDeclarationRenderer(): DeclarationBlockRenderer {
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

    const stateParam = state === 'default' ? null : (STATE_MAP[state] ?? null);
    const selectionParam = selection === 'selected' ? checked : null;

    const selectors = [selector(':host', selectionParam, stateParam)];

    if (selection === 'selected') {
      selectors.push(selector(':host', indeterminate, stateParam));
    }

    return {
      path,
      declarations,
      selectors,
    };
  };
}

export function renderStylesInOrder(
  tokens: ReadonlyArray<ReadonlySignal<TokenPackage>>,
): string {
  return [
    ...CHECKBOX_STATES.filter((state) => state !== 'disabled'),
    ...SELECTION_STATES.flatMap((selection) =>
      CHECKBOX_STATES.filter((state) => state !== 'disabled').map(
        (state) => `${selection}.${state}`,
      ),
    ),
    'disabled',
    'unselected.disabled',
    'selected.disabled',
  ]
    .flatMap((state) => tokens.map((pack) => pack.value.render({ state })))
    .join('\n\n');
}
