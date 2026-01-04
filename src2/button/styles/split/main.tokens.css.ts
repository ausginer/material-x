import { sizeTokens, splitDefaultTokens } from './tokens.ts';

const styles: string = [
  splitDefaultTokens.value.render(),
  ...sizeTokens.map((token) => token.value.render()),
].join('\n\n');

export default styles;
