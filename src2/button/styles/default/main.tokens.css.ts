import { prettify } from '../../../.tproc/css.ts';
import { defaultTokens } from './tokens.ts';

const styles: string = await prettify(defaultTokens.value.render());

export default styles;
