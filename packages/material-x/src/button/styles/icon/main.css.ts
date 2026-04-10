import { renderStylesInOrder } from '../utils.ts';
import { variantTokens, widthTokens } from './tokens.ts';

const styles: string = renderStylesInOrder([...variantTokens, ...widthTokens]);

export default styles;
