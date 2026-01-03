import { prettify } from '../../../.tproc/css.ts';
import { renderShapeTokens } from './tokens.ts';

const styles: string = await prettify(renderShapeTokens());

export default styles;
