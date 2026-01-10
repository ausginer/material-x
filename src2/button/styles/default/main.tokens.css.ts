import { defaultSizeMainTokens } from '../size/tokens.ts';
import { defaultTokens } from './tokens.ts';

const styles: string = [
  ...defaultTokens.map((s) => s.value.render()),
  defaultSizeMainTokens.value.render(),
].join('\n\n');

export default styles;
