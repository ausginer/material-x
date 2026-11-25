import css from './main.styles.css';
import { reorderTokens } from './tokens.ts';

const tokens = reorderTokens.value.render();

const styles: string = [tokens, css].join('\n\n');

export default styles;
