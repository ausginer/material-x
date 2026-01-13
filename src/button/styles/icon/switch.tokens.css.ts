import { variantSwitchTokens } from './tokens.ts';

const styles: string = variantSwitchTokens
  .map((token) => token.value.render())
  .join('\n\n');

export default styles;
