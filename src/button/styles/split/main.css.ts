import { renderButtonStylesInOrder } from '../utils.ts';
import css from './main.styles.css';
import { sizeTokens, splitDefaultTokens } from './tokens.ts';

const tokens = renderButtonStylesInOrder([splitDefaultTokens, ...sizeTokens]);

const styles: string = [tokens, css].join('\n\n');

export default styles;
