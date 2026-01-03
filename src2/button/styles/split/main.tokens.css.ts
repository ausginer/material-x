import { prettify } from '../../../.tproc/css.ts';
import { renderSplitTokens } from './tokens.ts';

const styles: string = await prettify(renderSplitTokens());

export default styles;
