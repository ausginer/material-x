import { renderButtonStylesInOrder } from '../utils.ts';
import { defaultSizeMainTokens, mainTokens } from './tokens.ts';

const styles: string = renderButtonStylesInOrder([
  defaultSizeMainTokens,
  ...mainTokens,
]);

export default styles;
