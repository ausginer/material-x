import { prettify } from '../../../.tproc/css.ts';
import { defaultSwitchTokens } from './tokens.ts';

const styles: string = await prettify(defaultSwitchTokens.value.render());

export default styles;
