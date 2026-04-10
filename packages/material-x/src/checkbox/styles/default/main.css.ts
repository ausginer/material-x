import { renderStylesInOrder } from '../utils.ts';
import css from './main.styles.css';
import { defaultTokens } from './tokens.ts';

const tokens = renderStylesInOrder([defaultTokens]);

const styles: string = [tokens, css].join('\n\n');

export default styles;
