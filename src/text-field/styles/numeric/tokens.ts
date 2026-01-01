import { resolveSet } from '../../../core/tokens/resolve.ts';
import { createVariables, packSet } from '../../../core/tokens/variable.ts';

const set = createVariables(
  resolveSet({
    'steppers.gap': '2px',
  }),
);

const packs: string = packSet(set);

export default packs;
