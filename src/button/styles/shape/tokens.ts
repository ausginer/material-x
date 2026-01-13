import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '../../../.tproc/index.ts';
import { attribute, pseudoClass, selector } from '../../../.tproc/selector.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import type { ProcessorAdjuster } from '../../../.tproc/utils.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';

type Shapes = 'round' | 'square';

const square = attribute('shape', 'square');
const squareState = pseudoClass('state', 'square');
const noAttribute = pseudoClass('not', attribute('shape'));
const checked = attribute('checked');

const createPackage = (
  shape: Shapes,
  adjuster: ProcessorAdjuster,
): TokenPackage =>
  adjuster(
    t.set({
      'container.shape': CSSVariable.ref(`container.shape.${shape}`),
    }),
  ).build();

export const shapeTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> = [
  computed(() =>
    createPackage('round', (processor) =>
      processor.renderDeclarations((path, declarations) => ({
        path,
        declarations,
        selectors: [
          selector(':host'),
          selector(':host', squareState, checked, noAttribute),
          selector(':host', square, checked),
        ],
      })),
    ),
  ),
  computed(() =>
    createPackage('square', (processor) =>
      processor.renderDeclarations((path, declarations) => ({
        path,
        declarations,
        selectors: [
          selector(':host', square),
          selector(':host', squareState, noAttribute),
          selector(':host', checked),
        ],
      })),
    ),
  ),
];
