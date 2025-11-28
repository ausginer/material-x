import { css, prettify } from '../../../core/tokens/css.ts';
import { pseudoClass } from '../../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

const { selected, unselected } = packs;

const checked = pseudoClass('state(checked)');

const switchStyles = [
  unselected &&
    buttonStates.map((s) => {
      return unselected[s]
        ? css`
            ${state[s]()} {
              ${unselected[s]};
            }
          `
        : null;
    }),
  selected &&
    buttonStates.map((s) =>
      selected[s]
        ? css`
            ${state[s](checked)} {
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
