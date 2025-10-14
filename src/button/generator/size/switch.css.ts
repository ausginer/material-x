import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute } from '../../../core/tokens/selector.ts';
import { buttonStates, state } from '../../utils.ts';
import packs from './tokens.ts';

const checked = attribute('checked');

const styles: string = await prettify(css`
  ${Object.entries(packs).map(([name, { unselected, selected }]) => {
    const size = attribute('size', name);

    return css`
      ${unselected &&
      buttonStates.map(
        (s) => css`
          ${state[s](size)} {
            ${unselected[s]};
          }
        `,
      )}

      ${selected &&
      buttonStates.map(
        (s) => css`
          ${state[s](size, checked)} {
            ${selected[s]};
          }
        `,
      )}
    `;
  })}
`);

console.log(styles);

export default styles;
