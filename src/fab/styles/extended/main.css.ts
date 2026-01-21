import { readFile } from 'node:fs/promises';
import { renderFABStylesInOrder } from '../utils.ts';
import { extendedTokens } from './tokens.ts';

const tokens = renderFABStylesInOrder(extendedTokens);

const css = await readFile(
  new URL('./main.styles.css', import.meta.url),
  'utf8',
);

const styles: string = [tokens, css].join('\n\n');

export default styles;
