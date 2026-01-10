import { defaultGeneralTokens, defaultTertiaryTokens } from './tokens.ts';

const styles: string = [
  defaultGeneralTokens.value.render(),
  defaultTertiaryTokens.value.render(),
].join('\n\n');

export default styles;
