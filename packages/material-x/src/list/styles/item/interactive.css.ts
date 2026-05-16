import { renderListItemInteractiveStyles } from '../utils.ts';
import css from './interactive.styles.css';
import { listItemInteractiveTokens } from './tokens.ts';

const tokens = renderListItemInteractiveStyles([listItemInteractiveTokens]);

const styles: string = [tokens, css].join('\n\n');

export default styles;
