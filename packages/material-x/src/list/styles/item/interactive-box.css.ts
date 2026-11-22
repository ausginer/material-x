import { renderListItemSelectableStyles } from '../utils.ts';
import css from './interactive-box.styles.css';
import { listItemTokens } from './tokens.ts';

const selectableTokens = renderListItemSelectableStyles([listItemTokens]);

const styles: string = [selectableTokens, css].join('\n\n');

export default styles;
