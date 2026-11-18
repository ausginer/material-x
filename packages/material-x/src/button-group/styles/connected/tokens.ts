import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '@ydinjs/tproc/index.js';
import type { ResolveAdjuster } from '@ydinjs/tproc/resolve.js';
import { pseudoClass } from '@ydinjs/tproc/selector.js';
import type { TokenPackage } from '@ydinjs/tproc/TokenPackage.js';
import type { ProcessorAdjuster } from '@ydinjs/tproc/utils.js';
import * as CSSVariable from '@ydinjs/tproc/variable.js';
import type { TupleToUnion } from 'type-fest';
import { fixFullShape } from '../../../button/styles/utils.ts';
import {
  BUTTON_GROUP_SIZES,
  connectedAllowedTokensSelector,
  connectedAllowedTokensWithShapeSelector,
  createButtonGroupDeclarationRenderer,
  groupButtonGroupTokens,
} from '../utils.ts';

const SET_BASE_NAME = 'md.comp.button-group.connected';

/**
 * Material's 50% corner is half the button's shorter side. This repository
 * draws it, like Material's circular shape, as half the button's own height.
 */
const fixHalfCorner: ResolveAdjuster = (value) =>
  value === '50%' ? CSSVariable.ref('shape.full') : value;

const createPackage = (
  size: TupleToUnion<typeof BUTTON_GROUP_SIZES>,
  adjuster: ProcessorAdjuster = (processor) => processor,
) => {
  const isSmall = size === 'small';
  const setName = `${SET_BASE_NAME}.${size}`;
  const allowedTokensSelector = isSmall
    ? connectedAllowedTokensWithShapeSelector
    : connectedAllowedTokensSelector;

  return adjuster(
    t
      .set(setName)
      .group(groupButtonGroupTokens)
      .select(allowedTokensSelector)
      // Inside a connected group, a selected button's outer corners are the
      // group's container shape, not the button's own toggle shape.
      .append('selected', {
        'outer-corner.corner-size': `${setName}.container.shape`,
      })
      .adjustTokens(fixFullShape, fixHalfCorner)
      // The pressed and selected sizes are declared on the slotted button, so
      // `--_shape-full` resolves against the button's own height.
      .renderDeclarations(
        createButtonGroupDeclarationRenderer({
          scope: isSmall ? null : pseudoClass('state', size),
          useSlottedStates: true,
        }),
      ),
  ).build();
};

export const connectedTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  BUTTON_GROUP_SIZES.map((size) => computed(() => createPackage(size)));
