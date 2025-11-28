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

const styles: string = await prettify(css`
  ${Object.entries(packs).map(([name, pack]) => {
    const size = attribute('size', name);

    return css`
      ${buttonStates.map((s) =>
        pack[s]
          ? css`
              ${state[s](size)} {
                &,
                ${slotted} {
                  ${pack[s]};
                }
              }
            `
          : null,
      )}
    `;
  })}
`);

export default styles;
