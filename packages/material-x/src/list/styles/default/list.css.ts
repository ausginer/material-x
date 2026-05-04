import css from './list.styles.css';
import { listTokens } from './tokens.ts';

const tokens = listTokens.value.render();

const styles: string = [tokens, css].join('\n\n');

export default styles;
