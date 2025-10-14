import { css, prettify } from '../../core/tokens/css.ts';
import { attribute } from '../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

const color = attribute('color', 'text');

const styles: string = await prettify(css`
  ${buttonStates.map(
    (s) => css`
      ${state[s](color)} {
        ${packs[s]};
      }
    `,
  )}
`);

export default styles;
