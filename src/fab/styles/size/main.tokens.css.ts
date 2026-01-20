import { renderFABStylesInOrder } from '../utils.ts';
import { sizeTokens } from './tokens.ts';

const styles: string = renderFABStylesInOrder(sizeTokens);

export default styles;
