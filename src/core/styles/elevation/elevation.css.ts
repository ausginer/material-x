import css from './elevation.styles.css';
import { elevationTokens } from './tokens.ts';

const tokens = elevationTokens.value.render();

const styles: string = [tokens, css].join('\n\n');

export default styles;
