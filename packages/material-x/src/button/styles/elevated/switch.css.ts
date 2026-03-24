import { renderSwitchStylesInOrder } from '../utils.ts';
import { elevatedSwitchTokens } from './tokens.ts';

const styles: string = renderSwitchStylesInOrder([elevatedSwitchTokens]);

export default styles;
