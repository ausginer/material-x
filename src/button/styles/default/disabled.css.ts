import { readFile } from 'node:fs/promises';
import { disabledTokens } from './tokens.ts';

const tokens = disabledTokens.value.render();

const css = await readFile(
  new URL('./disabled.styles.css', import.meta.url),
  'utf8',
);

const styles: string = [tokens, css].join('\n\n');

export default styles;
