import { renderTextFieldStylesInOrder } from '../utils.ts';
import {
  defaultDisabledTokens,
  defaultErrorTokens,
  defaultTokens,
} from './tokens.ts';

const styles: string = renderTextFieldStylesInOrder([
  defaultTokens,
  defaultErrorTokens,
  defaultDisabledTokens,
]);

export default styles;
