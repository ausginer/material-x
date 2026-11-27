import { renderStylesInOrder } from '../utils.ts';
import css from './main.styles.css';
import { defaultTokens, errorTokens } from './tokens.ts';

const tokens = renderStylesInOrder([defaultTokens, errorTokens]);

const styles: string = [tokens, css].join('\n\n');

export default styles;
