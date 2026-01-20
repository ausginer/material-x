import { renderFABStylesInOrder } from '../utils.ts';
import { extendedTokens } from './tokens.ts';

const styles: string = renderFABStylesInOrder(extendedTokens);

export default styles;
