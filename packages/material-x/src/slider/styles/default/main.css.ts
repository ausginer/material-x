import { defaultSizeTokens } from '../size/tokens.ts';
import { renderSliderStylesInOrder } from '../utils.ts';
import css from './main.styles.css';
import { defaultTokens } from './tokens.ts';

const tokens = renderSliderStylesInOrder([defaultTokens, defaultSizeTokens]);

const styles: string = [tokens, css].join('\n\n');

export default styles;
