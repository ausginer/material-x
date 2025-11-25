import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute } from '../../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

const color = attribute('color', 'elevated');

const mainStyles = buttonStates.map((s) =>
  s === 'default'
    ? css`
        ${state.default(color)} {
          ${packs.default};

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
);

const styles: string = await prettify(css`
  ${mainStyles}
`);

export default styles;
