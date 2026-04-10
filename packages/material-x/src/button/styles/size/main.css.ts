import { renderStylesInOrder } from '../utils.ts';
import { defaultSizeMainTokens, mainTokens } from './tokens.ts';

const styles: string = renderStylesInOrder([
  defaultSizeMainTokens,
  ...mainTokens,
]);

export default styles;
