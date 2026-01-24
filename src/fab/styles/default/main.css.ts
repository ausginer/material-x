import { defaultColorTokens } from '../color/tokens.ts';
import { renderFABStylesInOrder } from '../utils.ts';
import css from './main.styles.css';
import { defaultTokens } from './tokens.ts';

const tokens = renderFABStylesInOrder([defaultTokens, defaultColorTokens]);

const styles: string = [tokens, css].join('\n\n');

export default styles;
