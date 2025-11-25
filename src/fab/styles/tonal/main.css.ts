import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute } from '../../../core/tokens/selector.ts';
import { fabStates, state } from '../../utils.ts';
import packs from './tokens.ts';

const styles: string = await prettify(css`
  ${Object.entries(packs).map(([name, pack]) => {
    const color = name === 'tertiary' ? null : attribute('color', name);

    return css`
      ${fabStates.map(
        (s) => css`
          ${color ? state[s](color) : state[s]()} {
            ${pack[s]};
          }
        `,
      )}
    `;
  })}
`);

export default styles;
