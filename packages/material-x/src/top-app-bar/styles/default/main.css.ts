import css from './main.styles.css';
import { topAppBarTokens } from './tokens.ts';

const tokens = topAppBarTokens.value.render();

const styles: string = [tokens, css].join('\n\n');

export default styles;
