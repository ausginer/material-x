import { css, prettify } from '../../core/tokens/css.ts';
import { attribute } from '../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

const color = attribute('color', 'elevated');

const styles: string = await prettify(css`
  ${buttonStates.map((s) =>
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
      : css`
          ${state[s](color)} {
            ${packs[s]};
          }
        `,
  )}
`);

console.log(styles);

export default styles;
