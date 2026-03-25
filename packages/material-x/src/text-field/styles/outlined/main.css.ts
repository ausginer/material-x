import { renderTextFieldStylesInOrder } from '../utils.ts';
import css from './main.styles.css';
import {
  outlinedDisabledTokens,
  outlinedErrorTokens,
  outlinedTokens,
} from './tokens.ts';

const tokens = renderTextFieldStylesInOrder([
  outlinedTokens,
  outlinedErrorTokens,
  outlinedDisabledTokens,
]);

const styles: string = [tokens, css].join('\n\n');

export default styles;
