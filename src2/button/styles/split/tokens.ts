import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import type { Grouper, GroupSelector } from '../../../.tproc/utils.ts';
import {
  buttonMainTokenSelector,
  createButtonExtensions,
  createButtonScopedDeclarationRenderer,
  fixFullShape,
  groupButtonTokens,
} from '../utils.ts';

const SET_BASE_NAME = 'md.comp.split-button';
const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;

const skipGroup: Grouper = (tokenName) => ({
  path: 'default',
  name: `__skip.${tokenName}`,
});

export const splitDefaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_BASE_NAME)
    .group(skipGroup)
    .allowTokens(['menu-button.press.easing', 'menu-button.press.duration'])
    .append({
      default: {
        'menu-button.press.easing': motionEffects['standard.fast-spatial'],
        'menu-button.press.duration':
          motionEffects['standard.fast-spatial.duration'],
      },
    })
    .build(),
);

const createPackage = (
  size: string,
  ...groupSelectors: readonly GroupSelector[]
) =>
  t
    .set(`${SET_BASE_NAME}.${size}`)
    .group(groupButtonTokens)
    .select(...groupSelectors)
    .allowTokens([
      'trailing-button.icon.size',
      'inner-corner.corner-size',
      'leading-button.leading-space',
      'leading-button.trailing-space',
      'trailing-button.leading-space',
      'trailing-button.trailing-space',
    ])
    .extend(createButtonExtensions())
    .adjustTokens(fixFullShape)
    .renderDeclarations(
      createButtonScopedDeclarationRenderer(attribute('size', size)),
    )
    .build();

export const sizeTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SIZES.map((size) =>
    computed(() => createPackage(size, buttonMainTokenSelector)),
  );
