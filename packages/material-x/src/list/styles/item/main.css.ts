import { renderListItemBaseStyles } from '../utils.ts';
import css from './main.styles.css';
import { listItemBaseTokens } from './tokens.ts';

const tokens = renderListItemBaseStyles([listItemBaseTokens]);

const styles: string = [tokens, css].join('\n\n');

export default styles;
