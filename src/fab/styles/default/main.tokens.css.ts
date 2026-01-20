import { defaultColorTokens } from '../color/tokens.ts';
import { renderFABStylesInOrder } from '../utils.ts';
import { defaultTokens } from './tokens.ts';

const styles: string = renderFABStylesInOrder([
  defaultTokens,
  defaultColorTokens,
]);

export default styles;
