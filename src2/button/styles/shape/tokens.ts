import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '../../../.tproc/index.ts';
import type {
  RenderAdjuster,
  TokenPackage,
} from '../../../.tproc/TokenPackage.ts';
import type { Grouper } from '../../../.tproc/utils.ts';
import { CSSVariable } from '../../../.tproc/variable.ts';
import { createVariantStateAdjuster } from '../utils.ts';

const SHAPES = ['round', 'square'] as const;

const skipGroup: Grouper = (tokenName) => ({
  path: 'default',
  name: `__skip.${tokenName}`,
});

const createPackage = (
  shape: string,
  ...extraAdjusters: readonly RenderAdjuster[]
): TokenPackage =>
  t
    .set('md.comp.button')
    .scope('shape', shape)
    .group(skipGroup)
    .allowTokens(['container.shape'])
    .append({
      default: {
        'container.shape': CSSVariable.ref(`container.shape.${shape}`),
      },
    })
    .adjustRender(createVariantStateAdjuster('shape', shape), ...extraAdjusters)
    .build();

export const shapeTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SHAPES.map((shape) => computed(() => createPackage(shape)));
