import { readFile } from 'node:fs/promises';
import { elevatedTokens } from './tokens.ts';

const tokens = elevatedTokens.value.render();

const css = await readFile(
  new URL('./main.styles.css', import.meta.url),
  'utf8',
);

const styles: string = [tokens, css].join('\n\n');

export default styles;
