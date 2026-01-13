import { extendedTokens } from './tokens.ts';

const styles: string = extendedTokens
  .map((token) => token.value.render())
  .join('\n\n');

export default styles;
