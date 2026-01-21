import { readFile } from 'node:fs/promises';
import { renderTextFieldStylesInOrder } from '../utils.ts';
import {
  defaultDisabledTokens,
  defaultErrorTokens,
  defaultTokens,
} from './tokens.ts';

const tokens = renderTextFieldStylesInOrder([
  defaultTokens,
  defaultErrorTokens,
  defaultDisabledTokens,
]);

const css = await readFile(
  new URL('./main.styles.css', import.meta.url),
  'utf8',
);

const styles: string = [tokens, css].join('\n\n');

export default styles;
