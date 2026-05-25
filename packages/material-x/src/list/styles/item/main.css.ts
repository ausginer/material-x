import { renderListItemStyles } from '../utils.ts';
import css from './main.styles.css';
import { listItemTokens } from './tokens.ts';

const tokens = renderListItemStyles([listItemTokens]);

const styles: string = [tokens, css].join('\n\n');

export default styles;
