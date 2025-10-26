import { css, prettify } from '../../core/tokens/css.ts';
import { attribute } from '../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

const color = attribute('color', 'outlined');
const checked = attribute('checked');

const { selected, unselected } = packs;

const switchStyles = [
  unselected &&
    buttonStates.map((s) =>
      unselected[s]
        ? css`
            ${state[s](color)} {
              ${unselected[s]};
            }
          `
        : null,
    ),
  selected &&
    buttonStates.map((s) =>
      selected[s]
        ? css`
            ${state[s](color, checked)} {
              ${selected[s]};
            }
          `
        : null,
    ),
].flat();

const styles: string = await prettify(css`
  ${switchStyles}
`);

export default styles;
