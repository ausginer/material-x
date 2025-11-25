import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute } from '../../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

const checked = attribute('checked');

const switchStyles = Object.entries(packs).flatMap(
  ([name, { unselected, selected }]) => {
    const size = attribute('size', name);

    return [
      unselected &&
        buttonStates.map((s) =>
          unselected[s]
            ? css`
                ${state[s](size)} {
                  ${unselected[s]};
                }
              `
            : null,
        ),
      selected &&
        buttonStates.map((s) =>
          selected[s]
            ? css`
                ${state[s](size, checked)} {
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
