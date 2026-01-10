import { defaultSizeSwitchTokens } from '../size/tokens.ts';
import { defaultSwitchTokens } from './tokens.ts';

const styles: string = [
  ...defaultSwitchTokens.map((s) => s.value.render()),
  defaultSizeSwitchTokens.value.render(),
].join('\n\n');

export default styles;
