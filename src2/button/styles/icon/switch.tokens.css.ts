import { prettify } from '../../../.tproc/css.ts';
import { renderIconSwitchTokens } from './tokens.ts';

const styles: string = await prettify(renderIconSwitchTokens());

export default styles;
