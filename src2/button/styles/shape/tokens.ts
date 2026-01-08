import { computed, type ReadonlySignal } from '@preact/signals-core';
import type { TupleToUnion } from 'type-fest';
import { t } from '../../../.tproc/index.ts';
import { attribute, pseudoClass, selector } from '../../../.tproc/selector.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';

const SHAPES = ['round', 'square'] as const;
type Shapes = TupleToUnion<typeof SHAPES>;

function isDefaultShape(shape: Shapes): boolean {
  return shape === 'round';
}

const square = attribute('shape', 'square');
const squareState = pseudoClass('state', 'square');
const noAttribute = pseudoClass('not', attribute('shape'));
const checked = attribute('checked');

const defaultSelectors = [
  selector(':host'),
  selector(':host', squareState, checked, noAttribute),
  selector(':host', square, checked),
];

const squareSelectors = [
  selector(':host', square),
  selector(':host', squareState, noAttribute),
  selector(':host', checked),
];

const createPackage = (shape: Shapes): TokenPackage =>
  t
    .set({
      'container.shape': CSSVariable.ref(`container.shape.${shape}`),
    })
    .renderDeclarations((path, declarations) => ({
      path,
      declarations,
      selectors: isDefaultShape(shape) ? defaultSelectors : squareSelectors,
    }))
    .build();

export const shapeTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SHAPES.map((shape) => computed(() => createPackage(shape)));
