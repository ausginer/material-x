import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute, pseudoClass } from '../../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

const color = attribute('color', 'tonal');
const checked = attribute('checked');
const colorState = pseudoClass('state', 'tonal');
const noAttribute = pseudoClass('not', attribute('color'));

const { selected, unselected } = packs;

const switchStyles = [
  unselected &&
    buttonStates.map((s) =>
      unselected[s]
        ? css`
            ${state[s](color)}, ${state[s](colorState, noAttribute)} {
              ${unselected[s]};
            }
          `
        : null,
    ),
  selected &&
    buttonStates.map((s) =>
      selected[s]
        ? css`
            ${state[s](color, checked)}, ${state[s](
              colorState,
              checked,
              noAttribute,
            )} {
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
