import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import type { ExtensionCallback } from '../../../.tproc/TokenPackageProcessor.ts';
import type { Grouper, TokenSet } from '../../../.tproc/utils.ts';

const ERROR_STATE = 'error';
const TEXT_FIELD_STATE = ['default', 'hover', 'focus', 'disabled'] as const;

const ALLOWED = [
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
] as const;

const groupTextFieldTokens: Grouper = (tokenName) => {
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

function createTextFieldExtensions(
  base?: Readonly<Record<string, TokenSet>>,
): ExtensionCallback {
  const baseDefault = base?.['default'];

  const baseHover = base?.['hover'];
  const baseFocus = base?.['focus'];
  const baseDisabled = base?.['disabled'];

  return (m) => {
    const defaultState = m.state('default').extends(baseDefault);
    m.state('hovered').extends(defaultState, baseHover);
    m.state('focused').extends(defaultState, baseFocus);
    m.state('disabled').extends(defaultState, baseDisabled);

    const errorState = m.state('error').extends(defaultState);
    m.state('error.hovered').extends(defaultState, errorState);
    m.state('error.focused').extends(defaultState, errorState);
  };
}

// While there are no tokens for the sizes in this set, they are defined in the
// measurements section of https://m3.material.io/components/text-fields/specs.
const specialFilledTokens: TokenSet = {
  'container.icon.padding.inline': '12px',
  'container.padding.inline': '16px',
  'support-text.gap': '4px',
  'container.focus.padding.block': '8px',
  'input-text.prefix.gap': '2px',
  'input-text.suffix.gap': '2px',
  'focus.easing': motionEffects['expressive.fast-spatial'],
  'focus.duration': motionEffects['expressive.fast-spatial.duration'],
  // It looks like there is some misalignment in token names since
  // active-indicator.height is apparently active-indicator.thickness but they
  // coexist. So here we rename it to active-indicator.thickness to have them
  // aligned.
  'active-indicator.thickness':
    'md.comp.filled-text-field.active-indicator.height',
};

const createPackage = (type: 'filled' | 'outlined') => {
  const setName = `md.comp.${type}-text-field`;
  const processor = t
    .set(setName)
    .group(groupTextFieldTokens)
    .allowTokens(ALLOWED)
    .extend(createTextFieldExtensions());

  if (type === 'filled') {
    processor.append('default', specialFilledTokens);
  }

  return processor.build();
};

export const defaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage('filled'),
);

export const outlinedTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage('outlined'),
);
