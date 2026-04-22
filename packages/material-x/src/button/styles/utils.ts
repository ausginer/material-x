import type { ReadonlySignal } from '@preact/signals-core';
import type { ResolveAdjuster } from '../../.tproc/resolve.ts';
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
import * as CSSVariable from '../../.tproc/variable.ts';
import {
  createFullShapeFix,
  disabledTokenSelector,
  notDisabledTokenSelector,
} from '../../core/styles/utils.ts';

export const BUTTON_STATES = [
  'default',
  'hovered',
  'focused',
  'pressed',
  'disabled',
] as const;

export const SELECTION_STATES = ['unselected', 'selected'] as const;

export const BUTTON_STATE_MAP: Readonly<Record<string, Param>> = {
  hovered: pseudoClass('hover'),
  focused: pseudoClass('focus-within'),
  pressed: pseudoClass('active'),
  disabled: pseudoClass('disabled'),
};

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

export const fixFullShape: ResolveAdjuster = createFullShapeFix(
  CSSVariable.ref('shape.full'),
  (entry) => entry.includes('container.shape'),
);

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
    'ripple.opacity',
    'shadow.color',
    'state-layer.color',
    'state-layer.opacity',
    'level',
  ]);

export { disabledTokenSelector, notDisabledTokenSelector };

export function switchTokenSelector(path: string): boolean {
  return SELECTION_STATES.some((s) => path.includes(s));
}

export function mainTokenSelector(path: string): boolean {
  return !switchTokenSelector(path);
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
const checkedState = pseudoClass('state', 'checked');
const disabledState = pseudoClass('state', 'disabled');

export type ButtonScope = Readonly<{
  name: string;
  value: string;
  useState?: boolean;
}>;

/**
 * Builds a `DeclarationBlockRenderer` that maps token paths to `:host` CSS
 * selectors, expanding across three independent dimensions:
 *
 * **Dimension 1 — scope** (how the color/variant is addressed):
 *   - Always: attribute form   → `:host([color="standard"]…)`
 *   - When `useState: true`: custom-state form → `:host(:state(standard):not([color])…)`
 *
 * **Dimension 2 — checked** (only for `selected.*` token paths):
 *   - Attribute form   → `[checked]`
 *   - Custom-state form → `:state(checked)`
 *
 * **Dimension 3 — disabled** (only for `disabled` token paths):
 *   - Native form        → `:disabled`  (element's own `disabled` attr)
 *   - Custom-state form  → `:state(disabled)`  (set by group context)
 *
 * All three dimensions are crossed via `flatMap`, so the output is:
 *   - Default/other tokens:  1–2 selectors  (scope variants only)
 *   - Selected tokens:       2–4 selectors  (scope × checked)
 *   - Disabled tokens:       2–4 selectors  (scope × disabled)
 *   - Selected+disabled:     4–8 selectors  (scope × checked × disabled)
 *
 * Example output for `disabled` with `useState`:
 * ```css
 * :host([color="standard"]:disabled),
 * :host([color="standard"]:state(disabled)),
 * :host(:state(standard):not([color]):disabled),
 * :host(:state(standard):not([color]):state(disabled))
 * ```
 */
export function createScopedDeclarationRenderer(
  scope?: ButtonScope,
): DeclarationBlockRenderer {
  return (path, declarations) => {
    // path format: "state" or "selection.state"  e.g. "pressed" / "selected.hovered"
    let state: string;
    let selection: string | undefined;

    const index = path.indexOf('.');
    if (index < 0) {
      state = path;
    } else {
      selection = path.slice(0, index);
      state = path.slice(index + 1);
    }

    // Dimension 1: scope selector variants.
    // Each entry is a list of params that together identify the color/variant.
    const scopeBases = [
      // Attribute form: [color="standard"] — always present
      [scope ? attribute(scope.name, scope.value) : undefined],
      // Custom-state form: :state(standard):not([color]) — only when useState
      ...(scope?.useState
        ? [
            [
              pseudoClass('state', scope.value),
              pseudoClass('not', attribute(scope.name)),
            ],
          ]
        : []),
    ];

    // Dimension 2: checked selector variants.
    // Selected tokens need both [checked] and :state(checked) forms;
    // unselected tokens need neither ([null] produces no extra param).
    const checkedVariants =
      selection === 'selected' ? [checked, checkedState] : [null];

    // Dimension 3: disabled selector variants.
    // Disabled tokens need both :disabled (native attr) and :state(disabled)
    // (custom state set by group context); all other states use a single param.
    const stateVariants =
      state === 'disabled'
        ? [BUTTON_STATE_MAP['disabled'], disabledState]
        : [state === 'default' ? null : BUTTON_STATE_MAP[state]];

    // Cross all three dimensions to produce all required selectors.
    return {
      path,
      declarations,
      selectors: scopeBases.flatMap((base) =>
        checkedVariants.flatMap((c) =>
          stateVariants.map((s) => selector(':host', ...base, c, s)),
        ),
      ),
    };
  };
}

export function renderStylesInOrder(
  tokens: ReadonlyArray<ReadonlySignal<TokenPackage>>,
): string {
  return BUTTON_STATES.flatMap((state) =>
    tokens.map((pack) => pack.value.render({ state })),
  ).join('\n\n');
}

export function renderSwitchStylesInOrder(
  tokens: ReadonlyArray<ReadonlySignal<TokenPackage>>,
): string {
  return SELECTION_STATES.flatMap((selection) =>
    BUTTON_STATES.map((state) => `${selection}.${state}`),
  )
    .flatMap((state) => tokens.map((pack) => pack.value.render({ state })))
    .join('\n\n');
}
