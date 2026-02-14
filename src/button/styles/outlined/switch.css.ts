import { renderSwitchStylesInOrder } from '../utils.ts';
import { outlinedSwitchTokens } from './tokens.ts';

const styles: string = renderSwitchStylesInOrder([outlinedSwitchTokens]);

export default styles;
