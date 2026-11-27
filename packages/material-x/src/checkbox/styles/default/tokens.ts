import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '@ydinjs/tproc/default/motion-effects.js';
import { t } from '@ydinjs/tproc/index.js';
import type { TokenPackage } from '@ydinjs/tproc/TokenPackage.js';
import * as CSSVariable from '@ydinjs/tproc/variable.js';
import { createFullShapeFix } from '../../../core/styles/utils.ts';
import {
  allowedTokensSelector,
  createExtensions,
  createScopedDeclarationRenderer,
  errorAllowedTokensSelector,
  errorTokenSelector,
  groupTokens,
  notErrorTokenSelector,
} from '../utils.ts';

const SET_NAME = 'md.comp.checkbox';

const renderer = createScopedDeclarationRenderer();

const fixFullShape = createFullShapeFix(
  CSSVariable.ref('shape.full'),
  (entry) => entry.includes('state-layer.shape'),
);

const specialTokens = {
  // Token spec sets icon size to 18px (matching container.size), but Figma
  // uses 24px for the `check_small` and `check_indeterminate_small` Material
  // Symbols, which visually overflow the container to match M3 proportions. The
  // token value is overridden here to match the Figma intent.
  'icon.size': '24px',
  'outline.width': `${SET_NAME}.unselected.outline.width`,
  'outline.color': `${SET_NAME}.unselected.outline.color`,
  'state-layer.color': `${SET_NAME}.unselected.pressed.state-layer.color`,
  'state-layer.opacity': `${SET_NAME}.unselected.pressed.state-layer.opacity`,
  'ripple.color': CSSVariable.ref('state-layer.color'),
  'ripple.opacity': CSSVariable.ref('state-layer.opacity'),
  'icon.color': `${SET_NAME}.selected.pressed.icon.color`,
  'icon.opacity': `${SET_NAME}.selected.pressed.icon.opacity`,
  'check.easing': motionEffects['expressive.default-effects'],
  'check.duration': motionEffects['expressive.default-effects.duration'],
};

export const defaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_NAME)
    .group(groupTokens)
    .select(notErrorTokenSelector, allowedTokensSelector)
    .append('default', specialTokens)
    // The press wave draws its selection's pressed state layer for every
    // activation. No engine gives the host `:active` for a keyboard
    // activation, so the wave doesn't take the state layer that the host's
    // pseudo-classes select.
    .append('unselected.default', {
      'focus-layer.color': `${SET_NAME}.unselected.focus.state-layer.color`,
      'focus-layer.opacity': `${SET_NAME}.unselected.focus.state-layer.opacity`,
      'press-layer.color': `${SET_NAME}.unselected.pressed.state-layer.color`,
      'press-layer.opacity': `${SET_NAME}.unselected.pressed.state-layer.opacity`,
    })
    .append('selected.default', {
      'focus-layer.color': `${SET_NAME}.selected.focus.state-layer.color`,
      'focus-layer.opacity': `${SET_NAME}.selected.focus.state-layer.opacity`,
      'press-layer.color': `${SET_NAME}.selected.pressed.state-layer.color`,
      'press-layer.opacity': `${SET_NAME}.selected.pressed.state-layer.opacity`,
    })
    // The set also holds deprecated `disabled.selected.icon.color`,
    // `disabled.unselected.icon.color` and `unselected.*.icon.color`, which
    // group to the same paths, so the outline and disabled colors are named
    // rather than selected. A selected checkbox's outline is its container's
    // color, so only the unselected states name one.
    .append('unselected.hover', {
      'outline.color': `${SET_NAME}.unselected.hover.outline.color`,
    })
    .append('unselected.focus', {
      'outline.color': `${SET_NAME}.unselected.focus.outline.color`,
    })
    .append('unselected.pressed', {
      'outline.color': `${SET_NAME}.unselected.pressed.outline.color`,
    })
    .append('unselected.disabled', {
      'outline.color': `${SET_NAME}.unselected.disabled.outline.color`,
    })
    .append('selected.disabled', {
      'icon.color': `${SET_NAME}.selected.disabled.icon.color`,
    })
    .adjustTokens(fixFullShape)
    .extend(createExtensions())
    .renderDeclarations(renderer)
    .build(),
);

/**
 * The error states: Material's error colors for the outline, container, icon
 * and state layer, the focus layer's from the focused error state, and the
 * press wave's from the pressed one.
 */
export const errorTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_NAME)
    .group(groupTokens)
    .select(errorTokenSelector, errorAllowedTokensSelector)
    .append('error.default', {
      'focus-layer.color': `${SET_NAME}.error.focus.state-layer.color`,
      'focus-layer.opacity': `${SET_NAME}.error.focus.state-layer.opacity`,
      'press-layer.color': `${SET_NAME}.error.pressed.state-layer.color`,
      'press-layer.opacity': `${SET_NAME}.error.pressed.state-layer.opacity`,
    })
    .extend(createExtensions('error.'))
    .renderDeclarations(renderer)
    .build(),
);
