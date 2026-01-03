import { prettify } from '../../../.tproc/css.ts';
import { renderIconTokens } from './tokens.ts';

const styles: string = await prettify(renderIconTokens());

export default styles;
