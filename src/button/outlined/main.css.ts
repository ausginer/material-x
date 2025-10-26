import { css, prettify } from '../../core/tokens/css.ts';
import { attribute } from '../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

const color = attribute('color', 'outlined');

const styles: string = await prettify(css`
  ${buttonStates.map((s) =>
    s === 'default'
      ? css`
          ${state.default(color)} {
            ${packs.default};

            border: var(--_outline-width) solid var(--_outline-color);

            &::before,
            &::after {
              content: '';
            }
          }
        `
      : packs[s]
        ? css`
            ${state[s](color)} {
              ${packs[s]};
            }
          `
        : null,
  )}
`);

export default styles;
