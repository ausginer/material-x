import css from './main.styles.css';
import { connectedTokens } from './tokens.ts';

const tokens = connectedTokens.map((set) => set.value.render()).join('\n\n');

const styles: string = [tokens, css].join('\n\n');

export default styles;
