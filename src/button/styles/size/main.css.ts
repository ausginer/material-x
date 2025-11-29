import { css, prettify } from '../../../core/tokens/css.ts';
import {
  asterisk,
  attribute,
  pseudoElement,
} from '../../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

// This selector is used to stylize buttons inside a button-group.
const slotted = pseudoElement('slotted', asterisk);

const _styles = Object.entries(packs).flatMap(([name, pack]) => {
  const size = attribute('size', name);

  return buttonStates.map((s) => {
    if (!pack[s]) {
      return null;
    }

    if (s === 'default') {
      return css`
        ${state[s](size)} {
          &,
          ${slotted} {
            ${pack[s]};
          }
        }
      `;
    }

    return css`
      ${state[s](size)} {
        ${pack[s]};
      }
    `;
  });
});

const styles: string = await prettify(css`
  ${_styles}
`);

export default styles;
