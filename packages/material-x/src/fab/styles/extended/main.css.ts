import { renderFABStylesInOrder } from '../utils.ts';
import css from './main.styles.css';
import { extendedTokens } from './tokens.ts';

const tokens = renderFABStylesInOrder(extendedTokens);

const styles: string = [tokens, css].join('\n\n');

export default styles;
