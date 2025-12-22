import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute, pseudoClass } from '../../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

const color = attribute('color', 'text');
const colorState = pseudoClass('state', 'text');
const noAttribute = pseudoClass('not', attribute('color'));

const mainStyles = buttonStates.map((s) =>
  packs[s]
    ? css`
        ${state[s](color)}, ${state[s](colorState, noAttribute)} {
          ${packs[s]};
        }
      `
    : null,
);

const styles: string = await prettify(css`
  ${mainStyles}
`);

export default styles;
