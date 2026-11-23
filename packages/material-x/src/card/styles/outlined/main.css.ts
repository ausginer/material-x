import css from './main.styles.css';
import { outlinedTokens } from './tokens.ts';

const tokens = outlinedTokens.value.render();

const styles: string = [tokens, css].join('\n\n');

export default styles;
