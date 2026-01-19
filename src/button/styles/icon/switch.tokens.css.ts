import { renderSwitchStylesInOrder } from '../utils.ts';
import { variantSwitchTokens } from './tokens.ts';

const styles: string = renderSwitchStylesInOrder(variantSwitchTokens);

export default styles;
