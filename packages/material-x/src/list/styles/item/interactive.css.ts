import { renderListItemSelectableStyles } from '../utils.ts';
import { listItemTokens } from './tokens.ts';
import css from './interactive.styles.css' with { type: 'css' };

const selectableTokens = renderListItemSelectableStyles([listItemTokens]);

const styles: string = [selectableTokens, css].join('\n\n');

export default styles;
