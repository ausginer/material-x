import { mainTokens } from './tokens.ts';

const styles: string = mainTokens
  .map((token) => token.value.render())
  .join('\n\n');

export default styles;
