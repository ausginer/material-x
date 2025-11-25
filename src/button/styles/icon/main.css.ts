import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute } from '../../../core/tokens/selector.ts';
import type { TypedObjectConstructor } from '../../../interfaces.ts';
import { buttonStates, state } from '../utils.ts';
import packs, { variantAttribute, widthPacks } from './tokens.ts';

const mainStyles = Object.entries(packs).map(([name, pack]) => {
  const params = variantAttribute(name);

  return css`
    ${buttonStates.map((s) => {
      return pack[s]
        ? css`
            ${state[s](...params)} {
              ${pack[s]};
            }
          `
        : null;
    })}
  `;
});

const widthStyles = (Object as TypedObjectConstructor)
  .entries(widthPacks)
  .flatMap(([w, value]) => {
    const width = attribute('width', w);

    return Object.entries(value).flatMap(([name, packs]) => {
      const params = variantAttribute(name);

      return buttonStates.map((s) =>
        packs[s]
          ? css`
              ${state[s](...params, width)} {
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
