import { readFile } from 'node:fs/promises';
import { focusTokens } from './tokens.ts';

const tokens = focusTokens.value.render();

const css = await readFile(
  new URL('./focus.styles.css', import.meta.url),
  'utf8',
);

const styles: string = [tokens, css].join('\n\n');

export default styles;
