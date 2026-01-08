import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import {
  createAllowedTokensSelector,
  type GroupSelector,
} from '../../../.tproc/utils.ts';
import {
  buttonMainTokenSelector,
  createButtonExtensions,
  createButtonScopedDeclarationRenderer,
  fixFullShape,
  groupButtonTokens,
} from '../utils.ts';

const SET_BASE_NAME = 'md.comp.split-button';
const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;

export const splitDefaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_BASE_NAME)
    .select(
      createAllowedTokensSelector([
        'menu-button.press.easing',
        'menu-button.press.duration',
      ]),
    )
    .append({
      default: {
        'menu-button.press.easing': motionEffects['standard.fast-spatial'],
        'menu-button.press.duration':
          motionEffects['standard.fast-spatial.duration'],
      },
    })
    .build(),
);

const sizeAllowedTokensSelector = createAllowedTokensSelector([
  'trailing-button.icon.size',
  'inner-corner.corner-size',
  'leading-button.leading-space',
  'leading-button.trailing-space',
  'trailing-button.leading-space',
  'trailing-button.trailing-space',
]);

const createPackage = (
  size: string,
  ...groupSelectors: readonly GroupSelector[]
) =>
  t
    .set(`${SET_BASE_NAME}.${size}`)
    .group(groupButtonTokens)
    .select(...groupSelectors, sizeAllowedTokensSelector)
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
