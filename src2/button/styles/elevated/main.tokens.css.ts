import { prettify } from '../../../.tproc/css.ts';
import { elevatedTokens } from './tokens.ts';

const styles: string = await prettify(elevatedTokens.value.render());

export default styles;
