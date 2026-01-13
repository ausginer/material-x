import { colorTokens } from './tokens.ts';

const styles: string = colorTokens
  .map((token) => token.value.render())
  .join('\n\n');

export default styles;
