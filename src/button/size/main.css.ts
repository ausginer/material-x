import { css, prettify } from '../../core/tokens/css.ts';
import { attribute } from '../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

const styles: string = await prettify(css`
  ${Object.entries(packs).map(([name, pack]) => {
    const size = attribute('size', name);

    return css`
      ${buttonStates.map((s) =>
        pack[s]
          ? css`
              ${state[s](size)} {
                ${pack[s]};
              }
            `
          : null,
      )}
    `;
  })}
`);

export default styles;
