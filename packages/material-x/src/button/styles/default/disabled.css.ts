import css from './disabled.styles.css';
import { disabledTokens } from './tokens.ts';

const tokens = disabledTokens.value.render();

const styles: string = [tokens, css].join('\n\n');

export default styles;
