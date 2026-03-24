import { defaultSizeMainTokens } from '../size/tokens.ts';
import { renderButtonStylesInOrder } from '../utils.ts';
import css from './main.styles.css';
import { defaultFilledTokens, defaultTokens } from './tokens.ts';

const tokens = renderButtonStylesInOrder([
  defaultTokens,
  defaultFilledTokens,
  defaultSizeMainTokens,
]);

const styles: string = [tokens, css].join('\n\n');

export default styles;
