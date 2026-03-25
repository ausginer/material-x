import { renderTextFieldStylesInOrder } from '../utils.ts';
import cssDisabled from './disabled.styles.css';
import css from './main.styles.css';
import {
  defaultDisabledTokens,
  defaultErrorTokens,
  defaultTokens,
} from './tokens.ts';

const tokens = renderTextFieldStylesInOrder([
  defaultTokens,
  defaultErrorTokens,
]);

const disabled = defaultDisabledTokens.value.render();

const styles: string = [tokens, css, disabled, cssDisabled].join('\n\n');

export default styles;
