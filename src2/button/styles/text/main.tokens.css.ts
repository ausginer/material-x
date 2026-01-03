import { prettify } from '../../../.tproc/css.ts';
import { textTokens } from './tokens.ts';

const styles: string = await prettify(textTokens.value.render());

export default styles;
