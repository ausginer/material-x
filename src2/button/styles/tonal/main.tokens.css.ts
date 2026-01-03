import { prettify } from '../../../.tproc/css.ts';
import { tonalTokens } from './tokens.ts';

const styles: string = await prettify(tonalTokens.value.render());

export default styles;
