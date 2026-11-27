import type { ReadonlySignal } from '@preact/signals-core';
import { pseudoClass, selector, type Param } from '@ydinjs/tproc/selector.js';
import type {
  DeclarationBlockRenderer,
  TokenPackage,
} from '@ydinjs/tproc/TokenPackage.js';
import type { ExtensionCallback } from '@ydinjs/tproc/TokenPackageProcessor.js';
import {
  createAllowedTokensSelector,
  type GroupResult,
  type GroupSelector,
} from '@ydinjs/tproc/utils.js';
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

/** The prefix of the error states' paths, such as `error.selected.hover`. */
const ERROR_PREFIX = 'error.';

/**
 * Groups a token by its path: `[error.][selection.]state`, such as
 * `error.unselected.focus` for `unselected.error.focus.outline.color`.
 */
export function groupTokens(tokenName: string): GroupResult {
  const parts = tokenName.split('.');
  let error = false;
  let selection: string | undefined;
  let state = 'default';
  const nameParts: string[] = [];

  for (const part of parts) {
    if (part === 'error') {
      error = true;
      continue;
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

  const path = selection ? `${selection}.${state}` : state;

  return {
    path: error ? `${ERROR_PREFIX}${path}` : path,
    tokenName: nameParts.join('.'),
  };
}

export { disabledTokenSelector, notDisabledTokenSelector };

export function errorTokenSelector(path: string): boolean {
  return path.startsWith(ERROR_PREFIX);
}

export function notErrorTokenSelector(path: string): boolean {
  return !errorTokenSelector(path);
}

/**
 * The states' inheritance, under `prefix`: none for the states without error,
 * `error.` for the error states. Material has no disabled error state.
 *
 * A state's tokens are deduplicated against its parents'. `unselected.hover`'s
 * selector also matches a selected host and sets the hover layer's
 * `on-surface`, so `selected.hover` extends it, after `selected.default`, and
 * keeps the `primary` that differs from it.
 */
export function createExtensions(prefix = ''): ExtensionCallback {
  return (m) => {
    const state = (path: string) => m.state(`${prefix}${path}`);

    const defaultState = state('default').extends();
    state('hover').extends(defaultState);
    state('focus').extends(defaultState);
    state('pressed').extends(defaultState);

    if (!prefix) {
      state('disabled').extends(defaultState);
    }

    const unselectedDefault = state('unselected.default').extends(defaultState);
    const unselectedHover = state('unselected.hover').extends(
      defaultState,
      unselectedDefault,
    );
    state('unselected.focus').extends(defaultState, unselectedDefault);
    state('unselected.pressed').extends(defaultState, unselectedDefault);

    const selectedDefault = state('selected.default').extends(
      defaultState,
      unselectedDefault,
    );
    state('selected.hover').extends(
      defaultState,
      unselectedDefault,
      selectedDefault,
      unselectedHover,
    );
    state('selected.focus').extends(
      defaultState,
      unselectedDefault,
      selectedDefault,
    );
    state('selected.pressed').extends(
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

/**
 * The error states' tokens. The error states draw the outline and icon colors
 * of their own state. The enabled states without error keep the default
 * state's, and the disabled states take theirs from `defaultTokens`.
 */
export const errorAllowedTokensSelector: GroupSelector =
  createAllowedTokensSelector([
    'container.color',
    'outline.color',
    'icon.color',
    'state-layer.color',
    'state-layer.opacity',
  ]);

const checked = pseudoClass('state', 'checked');
const indeterminate = pseudoClass('state', 'indeterminate');

/**
 * A disabled checkbox draws its disabled appearance whatever `error` says. The
 * disabled states set no outline color, so the error states exclude
 * `:disabled` rather than rely on the order.
 */
const enabledError = [
  pseudoClass('state', 'error'),
  pseudoClass('not', pseudoClass('disabled')),
] as const;

export function createScopedDeclarationRenderer(): DeclarationBlockRenderer {
  return (path, declarations) => {
    const error = errorTokenSelector(path);
    const [first, second] = path
      .slice(error ? ERROR_PREFIX.length : 0)
      .split('.');
    const [selection, state] = second ? [first, second] : [undefined, first!];

    const stateParam = state === 'default' ? null : (STATE_MAP[state] ?? null);
    const errorParams = error ? enabledError : [];

    const selectors = [
      selector(
        ':host',
        selection === 'selected' ? checked : null,
        ...errorParams,
        stateParam,
      ),
    ];

    if (selection === 'selected') {
      selectors.push(
        selector(':host', indeterminate, ...errorParams, stateParam),
      );
    }

    return {
      path,
      declarations,
      selectors,
    };
  };
}

const ENABLED_STATES = CHECKBOX_STATES.filter((state) => state !== 'disabled');

const ENABLED_PATHS = [
  ...ENABLED_STATES,
  ...SELECTION_STATES.flatMap((selection) =>
    ENABLED_STATES.map((state) => `${selection}.${state}`),
  ),
];

/** The states in their order: enabled, error, then disabled. */
export function renderStylesInOrder(
  tokens: ReadonlyArray<ReadonlySignal<TokenPackage>>,
): string {
  return [
    ...ENABLED_PATHS,
    ...ENABLED_PATHS.map((path) => `${ERROR_PREFIX}${path}`),
    'disabled',
    'unselected.disabled',
    'selected.disabled',
  ]
    .flatMap((state) => tokens.map((pack) => pack.value.render({ state })))
    .join('\n\n');
}
