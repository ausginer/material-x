import { variantTokens, widthTokens } from './tokens.ts';

const styles: string = [
  ...variantTokens.map((token) => token.value.render()),
  ...widthTokens.map((token) => token.value.render()),
].join('\n\n');

export default styles;
