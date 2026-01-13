import { tonalTokens } from './tokens.ts';

const styles: string = tonalTokens
  .map((token) => token.value.render())
  .join('\n\n');

export default styles;
