import { readFile } from 'node:fs/promises';
import { renderButtonStylesInOrder } from '../utils.ts';
import { sizeTokens, splitDefaultTokens } from './tokens.ts';

const tokens = renderButtonStylesInOrder([splitDefaultTokens, ...sizeTokens]);

const css = await readFile(
  new URL('./main.styles.css', import.meta.url),
  'utf8',
);

const styles: string = [tokens, css].join('\n\n');

export default styles;
