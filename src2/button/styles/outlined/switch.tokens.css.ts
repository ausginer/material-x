import { prettify } from '../../../.tproc/css.ts';
import { outlinedSwitchTokens } from './tokens.ts';

const styles: string = await prettify(outlinedSwitchTokens.value.render());

export default styles;
