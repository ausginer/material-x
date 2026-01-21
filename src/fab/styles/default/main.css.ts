import { readFile } from 'node:fs/promises';
import { defaultColorTokens } from '../color/tokens.ts';
import { renderFABStylesInOrder } from '../utils.ts';
import { defaultTokens } from './tokens.ts';

const tokens = renderFABStylesInOrder([defaultTokens, defaultColorTokens]);

const css = await readFile(
  new URL('./main.styles.css', import.meta.url),
  'utf8',
);

const styles: string = [tokens, css].join('\n\n');

export default styles;
