import { renderStylesInOrder } from '../utils.ts';
import { shapeTokens } from './tokens.ts';

const styles: string = renderStylesInOrder(shapeTokens);

export default styles;
