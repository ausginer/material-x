import css from './main.styles.css';
import { defaultTokens } from './tokens.ts';

const tokens = defaultTokens.value.render();

const styles: string = [tokens, css].join('\n\n');

export default styles;
