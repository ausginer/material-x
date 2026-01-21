import { readFile } from 'node:fs/promises';
import { defaultSizeMainTokens } from '../size/tokens.ts';
import { renderButtonStylesInOrder } from '../utils.ts';
import { defaultTokens, defaultFilledTokens } from './tokens.ts';

const tokens = renderButtonStylesInOrder([
  defaultTokens,
  defaultFilledTokens,
  defaultSizeMainTokens,
]);

const css = await readFile(
  new URL('./main.styles.css', import.meta.url),
  'utf8',
);

const styles: string = [tokens, css].join('\n\n');

export default styles;
