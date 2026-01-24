import css from './focus.styles.css';
import { focusTokens } from './tokens.ts';

const tokens = focusTokens.value.render();

const styles: string = [tokens, css].join('\n\n');

export default styles;
