import { renderFABStylesInOrder } from '../utils.ts';
import { colorTokens } from './tokens.ts';

const styles: string = renderFABStylesInOrder(colorTokens);

export default styles;
