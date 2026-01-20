import { renderButtonStylesInOrder } from '../utils.ts';
import { sizeTokens, splitDefaultTokens } from './tokens.ts';

const styles: string = renderButtonStylesInOrder([
  splitDefaultTokens,
  ...sizeTokens,
]);

export default styles;
