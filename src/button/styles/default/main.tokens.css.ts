import { defaultSizeMainTokens } from '../size/tokens.ts';
import { renderButtonStylesInOrder } from '../utils.ts';
import { defaultTokens, defaultFilledTokens } from './tokens.ts';

const styles: string = renderButtonStylesInOrder([
  defaultTokens,
  defaultFilledTokens,
  defaultSizeMainTokens,
]);

export default styles;
