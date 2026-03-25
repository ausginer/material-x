import css from './main.styles.css';
import { standardTokens } from './tokens.ts';

const tokens = standardTokens.map((set) => set.value.render()).join('\n\n');

const styles: string = [tokens, css].join('\n\n');

export default styles;
