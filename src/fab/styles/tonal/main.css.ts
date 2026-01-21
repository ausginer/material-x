import { renderFABStylesInOrder } from '../utils.ts';
import { tonalTokens } from './tokens.ts';

const styles: string = renderFABStylesInOrder(tonalTokens);

export default styles;
