import { sizeTokens } from './tokens.ts';

const styles: string = sizeTokens
  .map((token) => token.value.render())
  .join('\n\n');

export default styles;
