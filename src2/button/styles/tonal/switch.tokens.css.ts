import { prettify } from '../../../.tproc/css.ts';
import { tonalSwitchTokens } from './tokens.ts';

const styles: string = await prettify(tonalSwitchTokens.value.render());

export default styles;
