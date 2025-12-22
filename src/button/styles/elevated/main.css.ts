import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute, pseudoClass } from '../../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

const color = attribute('color', 'elevated');
const colorState = pseudoClass('state', 'elevated');
const noAttribute = pseudoClass('not', attribute('color'));

const mainStyles = buttonStates.map((s) =>
  s === 'default'
    ? css`
        ${state.default(color)}, ${state.default(colorState, noAttribute)} {
          ${packs.default};

          &::before,
          &::after {
            content: '';
          }
        }
      `
    : packs[s]
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
