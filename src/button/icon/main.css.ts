import { css, prettify } from '../../core/tokens/css.ts';
import { attribute } from '../../core/tokens/selector.ts';
import { TypedObject } from '../../interfaces.ts';
import { buttonStates, state } from '../utils.ts';
import packs, { DEFAULTS, widthPacks } from './tokens.ts';

const mainStyles = Object.entries(packs).map(([s, pack]) => {
  const size = (DEFAULTS as readonly string[]).includes(s)
    ? null
    : attribute('size', s);

  return css`
    ${buttonStates.map((s) => {
      return pack[s]
        ? css`
            ${state[s](size)} {
              ${pack[s]};
            }
          `
        : null;
    })}
  `;
});

const widthStyles = TypedObject.entries(widthPacks).flatMap(([w, value]) => {
  const width = attribute('width', w);

  return Object.entries(value).flatMap(([s, packs]) => {
    const size = attribute('size', s);

    return buttonStates.map((s) =>
      packs[s]
        ? css`
            ${state[s](size, width)} {
              ${packs[s]};
            }
          `
        : null,
    );
  });
});

const styles: string = await prettify(css`
  ${mainStyles}

  ${widthStyles}
`);

export default styles;
