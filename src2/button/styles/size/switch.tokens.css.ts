import { prettify } from '../../../.tproc/css.ts';
import { renderSizeSwitchTokens } from './tokens.ts';

const styles: string = await prettify(renderSizeSwitchTokens());

export default styles;
