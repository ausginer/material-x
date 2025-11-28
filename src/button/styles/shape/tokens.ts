import { resolveSet } from '../../../core/tokens/resolve.ts';
import {
  createVariables,
  CSSVariable,
  packSet,
} from '../../../core/tokens/variable.ts';

const round = createVariables(
  resolveSet({
    'container.shape': CSSVariable.ref('container.shape.round'),
  }),
);

const square = createVariables(
  resolveSet({
    'container.shape': CSSVariable.ref('container.shape.square'),
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
