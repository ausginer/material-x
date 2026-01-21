import { readFile } from 'node:fs/promises';
import { elevationTokens } from './tokens.ts';

const tokens = elevationTokens.value.render();

const css = await readFile(
  new URL('./elevation.styles.css', import.meta.url),
  'utf8',
);

const styles: string = [tokens, css].join('\n\n');

export default styles;
