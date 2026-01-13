import { defaultColorTokens } from '../color/tokens.ts';
import { defaultTokens } from './tokens.ts';

const styles: string = [
  defaultTokens.value.render(),
  defaultColorTokens.value.render(),
].join('\n\n');

export default styles;
