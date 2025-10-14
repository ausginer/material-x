import { resolveSet } from '../../../core/tokens/resolve.ts';
import {
  createVariables,
  CSSVariable,
  packSet,
} from '../../../core/tokens/variable.ts';

const round = createVariables(
  resolveSet({
    'container.shape.default': CSSVariable.ref('container.shape.round'),
    'container.shape.pressed': CSSVariable.ref('container.shape.square'),
  }),
);

const square = createVariables(
  resolveSet({
    'container.shape.default': CSSVariable.ref('container.shape.square'),
    'container.shape.pressed': CSSVariable.ref('container.shape.round'),
  }),
);

export type Packs = Readonly<{
  round: string;
  square: string;
}>;

const packs: Packs = {
  round: packSet(round),
  square: packSet(square),
};

export default packs;
