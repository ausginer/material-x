import { prettify } from '../../../.tproc/css.ts';
import { outlinedTokens } from './tokens.ts';

const styles: string = await prettify(outlinedTokens.value.render());

export default styles;
