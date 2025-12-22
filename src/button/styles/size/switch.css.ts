import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute, pseudoClass } from '../../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

const checked = attribute('checked');
const noAttribute = pseudoClass('not', attribute('size'));

const switchStyles = Object.entries(packs).flatMap(
  ([name, { unselected, selected }]) => {
    const size = attribute('size', name);
    const sizeState = pseudoClass('state', name);

    return [
      unselected &&
        buttonStates.map((s) =>
          unselected[s]
            ? css`
                ${state[s](size)}, ${state[s](sizeState, noAttribute)} {
                  ${unselected[s]};
                }
              `
            : null,
        ),
      selected &&
        buttonStates.map((s) =>
          selected[s]
            ? css`
                ${state[s](size, checked)}, ${state[s](
                  sizeState,
                  checked,
                  noAttribute,
                )} {
                  ${selected[s]};
                }
              `
            : null,
        ),
    ].flat();
  },
);

const styles: string = await prettify(css`
  ${switchStyles}
`);

export default styles;
