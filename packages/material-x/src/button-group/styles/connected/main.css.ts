import css from './main.styles.css';
import { connectedTokens } from './tokens.ts';

// A pressed button's corners follow the press while it is pressed, also when
// it is selected, so `pressed` renders after `selected` at equal specificity.
const tokens = connectedTokens
  .flatMap((set) =>
    ['default', 'selected', 'pressed'].map((state) =>
      set.value.render({ state }),
    ),
  )
  .join('\n\n');

const styles: string = [tokens, css].join('\n\n');

export default styles;
