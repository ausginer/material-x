import { defaultSizeSwitchTokens } from '../size/tokens.ts';
import { renderSwitchStylesInOrder } from '../utils.ts';
import { defaultSwitchFilledTokens, defaultSwitchTokens } from './tokens.ts';

const styles: string = renderSwitchStylesInOrder([
  defaultSwitchTokens,
  defaultSwitchFilledTokens,
  defaultSizeSwitchTokens,
]);

export default styles;
