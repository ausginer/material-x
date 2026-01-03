import { prettify } from '../../../.tproc/css.ts';
import { elevatedSwitchTokens } from './tokens.ts';

const styles: string = await prettify(elevatedSwitchTokens.value.render());

export default styles;
