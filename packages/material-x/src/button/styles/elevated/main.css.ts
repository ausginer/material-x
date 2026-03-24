import css from './main.styles.css';
import { elevatedTokens } from './tokens.ts';

const tokens = elevatedTokens.value.render();

const styles: string = [tokens, css].join('\n\n');

export default styles;
