import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute, pseudoClass } from '../../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

const noAttribute = pseudoClass('not', attribute('size'));

const _styles = Object.entries(packs).flatMap(([name, pack]) => {
  const size = attribute('size', name);
  const sizeState = pseudoClass('state', name);

  return buttonStates.map((s) => {
    if (!pack[s]) {
      return null;
    }

    if (s === 'default') {
      return css`
        ${state[s](size)}, ${state[s](sizeState, noAttribute)} {
          ${pack[s]};
        }
      `;
    }

    return css`
      ${state[s](size)}, ${state[s](sizeState, noAttribute)} {
        ${pack[s]};
      }
    `;
  });
});

const styles: string = await prettify(css`
  ${_styles}
`);

export default styles;
