import { css, prettify } from '../../core/tokens/css.ts';
import { attribute } from '../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

const color = attribute('color', 'outlined');
const checked = attribute('checked');

const { selected, unselected } = packs;

const styles: string = await prettify(css`
  ${buttonStates.map(
    (s) => css`
      ${state[s](color)} {
        ${unselected[s]};
      }
    `,
  )}

  ${buttonStates.map(
    (s) => css`
      ${state[s](color, checked)} {
        ${selected[s]};
      }
    `,
  )}
`);

console.log(styles);

export default styles;
