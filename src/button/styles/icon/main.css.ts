import { renderButtonStylesInOrder } from '../utils.ts';
import { variantTokens, widthTokens } from './tokens.ts';

const styles: string = renderButtonStylesInOrder([
  ...variantTokens,
  ...widthTokens,
]);

export default styles;
