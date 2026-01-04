import { switchTokens } from './tokens.ts';

const styles: string = switchTokens
  .map((token) => token.value.render())
  .join('\n\n');

export default styles;
