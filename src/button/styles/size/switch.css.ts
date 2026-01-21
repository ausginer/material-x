import { renderSwitchStylesInOrder } from '../utils.ts';
import { switchTokens } from './tokens.ts';

const styles: string = renderSwitchStylesInOrder(switchTokens);

export default styles;
