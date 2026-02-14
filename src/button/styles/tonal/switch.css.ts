import { renderSwitchStylesInOrder } from '../utils.ts';
import { tonalSwitchTokens } from './tokens.ts';

const styles: string = renderSwitchStylesInOrder([tonalSwitchTokens]);

export default styles;
