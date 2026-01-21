import { readFile } from 'node:fs/promises';
import { standardTokens } from './tokens.ts';

const tokens = standardTokens.map((set) => set.value.render()).join('\n\n');

const css = await readFile(
  new URL('./main.styles.css', import.meta.url),
  'utf8',
);

const styles: string = [tokens, css].join('\n\n');

export default styles;
