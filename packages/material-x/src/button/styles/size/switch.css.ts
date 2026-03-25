import { renderSwitchStylesInOrder } from '../utils.ts';
import { defaultSizeSwitchTokens, switchTokens } from './tokens.ts';

const styles: string = renderSwitchStylesInOrder([
  defaultSizeSwitchTokens,
  ...switchTokens,
]);

export default styles;
