import { prettify } from '../../../.tproc/css.ts';
import { renderSizeTokens } from './tokens.ts';

const styles: string = await prettify(renderSizeTokens());

export default styles;
