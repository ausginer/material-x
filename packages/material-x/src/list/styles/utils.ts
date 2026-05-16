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
import {
  createAllowedTokensSelector,
  type GroupResult,
  type GroupSelector,
} from '../../.tproc/utils.ts';

export const LIST_ITEM_STATES = [
  'default',
  'hovered',
  'focused',
  'pressed',
  'disabled',
] as const;

export const LIST_ITEM_SELECTION_STATES = ['unselected', 'selected'] as const;

const STATE_MAP: Readonly<Record<string, Param | readonly Param[]>> = {
  hovered: pseudoClass('hover'),
  focused: [pseudoClass('focus-within'), attribute('selected')],
  dragged: pseudoClass('drag'),
  pressed: pseudoClass('active'),
  disabled: attribute('disabled'),
};

export function groupListItemTokens(tokenName: string): GroupResult | null {
  if (tokenName.startsWith('focus.indicator.')) {
    return {
      path: 'default',
      tokenName,
    };
  }

  if (!tokenName.startsWith('list-item.')) {
    return null;
  }

  const parts = tokenName.slice('list-item.'.length).split('.');

  let selection: string | undefined;
  let state = 'default';

  const nameParts: string[] = [];

  for (const part of parts) {
    if (LIST_ITEM_SELECTION_STATES.includes(part)) {
      selection = part;
      continue;
    }

    if (LIST_ITEM_STATES.includes(part)) {
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

export function groupListTokens(tokenName: string): GroupResult | null {
  return {
    path: 'default',
    tokenName,
  };
}

export const listItemAllowedTokensSelector: GroupSelector =
  createAllowedTokensSelector([
    'bottom-space',
    'between-space',
    'container.color',
    'container.elevation',
    'container.expressive.shape',
    'container.height',
    'container.opacity',
    'focus-indicator.color',
    'focus-indicator.outline.offset',
    'focus-indicator.thickness',
    'label-text',
    'label-text.color',
    'label-text.font',
    'label-text.line-height',
    'label-text.size',
    'label-text.tracking',
    'label-text.type',
    'label-text.weight',
    'large.leading-video.height',
    'large.leading-video.width',
    'leading-avatar-label',
    'leading-avatar-label.color',
    'leading-avatar-label.font',
    'leading-avatar-label.line-height',
    'leading-avatar-label.size',
    'leading-avatar-label.tracking',
    'leading-avatar-label.type',
    'leading-avatar-label.weight',
    'leading-avatar.color',
    'leading-avatar.shape',
    'leading-avatar.size',
    'leading-icon.color',
    'leading-icon.expressive.size',
    'leading-image.expressive.shape',
    'leading-image.height',
    'leading-image.width',
    'leading-space',
    'leading-video.shape',
    'leading-video.width',
    'one-line.container.height',
    'overline',
    'overline.color',
    'overline.font',
    'overline.line-height',
    'overline.size',
    'overline.tracking',
    'overline.type',
    'overline.weight',
    'selected.container.color',
    'shadow.color',
    'small.leading-video.height',
    'small.leading-video.width',
    'state-layer.color',
    'state-layer.opacity',
    'supporting-text',
    'supporting-text.color',
    'supporting-text.font',
    'supporting-text.line-height',
    'supporting-text.size',
    'supporting-text.tracking',
    'supporting-text.type',
    'supporting-text.weight',
    'three-line.container.height',
    'top-space',
    'trailing-icon.color',
    'trailing-icon.expressive.size',
    'trailing-space',
    'trailing-supporting-text',
    'trailing-supporting-text.color',
    'trailing-supporting-text.font',
    'trailing-supporting-text.line-height',
    'trailing-supporting-text.size',
    'trailing-supporting-text.tracking',
    'trailing-supporting-text.type',
    'trailing-supporting-text.weight',
    'two-line.container.height',
  ]);

const INTERACTIVE_DEFAULT_TOKENS = new Set([
  'container.elevation',
  'focus-indicator.color',
  'focus-indicator.outline.offset',
  'focus-indicator.thickness',
  'press.duration',
  'press.easing',
  'ripple.color',
  'ripple.opacity',
  'shadow.color',
  'state-layer.color',
  'state-layer.opacity',
]);

export function listItemBaseTokenSelector(
  path: string,
  tokenName?: string,
): boolean {
  return (
    path === 'default' &&
    tokenName != null &&
    !INTERACTIVE_DEFAULT_TOKENS.has(tokenName)
  );
}

export function listItemInteractiveTokenSelector(
  path: string,
  tokenName?: string,
): boolean {
  return (
    path !== 'default' ||
    (tokenName != null && INTERACTIVE_DEFAULT_TOKENS.has(tokenName))
  );
}

export const listAllowedTokensSelector: GroupSelector =
  createAllowedTokensSelector([
    'container.color',
    'container.shape',
    'segmented.gap',
  ]);

export function createListItemDeclarationRenderer(): DeclarationBlockRenderer {
  return (path, declarations) => {
    const index = path.indexOf('.');

    const state = index < 0 ? path : path.slice(index + 1);
    let selectors: string[];

    if (state === 'default') {
      selectors = [selector(':host')];
    } else {
      const params = STATE_MAP[state]
        ? Array.isArray(STATE_MAP[state])
          ? STATE_MAP[state]
          : [STATE_MAP[state]]
        : [];
      selectors = params.map((p) => selector(':host', p));
    }

    return {
      path,
      declarations,
      selectors,
    };
  };
}

export function renderListItemBaseStyles(
  tokens: ReadonlyArray<ReadonlySignal<TokenPackage>>,
): string {
  return tokens
    .map((pack) => pack.value.render({ state: 'default' }))
    .join('\n\n');
}

export function renderListItemInteractiveStyles(
  tokens: ReadonlyArray<ReadonlySignal<TokenPackage>>,
): string {
  return LIST_ITEM_STATES.flatMap((state) =>
    tokens.map((pack) => pack.value.render({ state })),
  ).join('\n\n');
}

export function renderListItemSelectableStyles(
  tokens: ReadonlyArray<ReadonlySignal<TokenPackage>>,
): string {
  return LIST_ITEM_SELECTION_STATES.flatMap((selection) =>
    LIST_ITEM_STATES.map((state) => `${selection}.${state}`),
  )
    .flatMap((state) => tokens.map((pack) => pack.value.render({ state })))
    .join('\n\n');
}
