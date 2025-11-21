import { css, prettify } from '../../core/tokens/css.ts';
import { attribute } from '../../core/tokens/selector.ts';
import { type TypedObjectConstructor } from '../../interfaces.ts';
import { buttonStates, state } from '../utils.ts';
import packs, { DEFAULTS, widthPacks } from './tokens.ts';

const checked = attribute('checked');

const mainStyles = (Object as TypedObjectConstructor)
  .entries(packs)
  .flatMap(([s, packs]) => {
    const size = (DEFAULTS as readonly string[]).includes(s)
      ? null
      : attribute('size', s);

    const { unselected, selected } = packs;

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
    ];
  });

const widthStyles = (Object as TypedObjectConstructor)
  .entries(widthPacks)
  .flatMap(([w, packs]) => {
    const width = attribute('width', w);

    return (Object as TypedObjectConstructor)
      .entries(packs)
      .flatMap(([s, packs]) => {
        const { selected, unselected } = packs;
        const size = attribute('size', s);

        return [
          unselected &&
            buttonStates.map((s) =>
              unselected[s]
                ? css`
                    ${state[s](size, width)} {
                      ${unselected[s]};
                    }
                  `
                : null,
            ),
          selected &&
            buttonStates.map((s) =>
              selected[s]
                ? css`
                    ${state[s](size, width, checked)} {
                      ${selected[s]};
                    }
                  `
                : null,
            ),
        ]
          .filter((v) => v != null)
          .flat();
      });
  });

const styles: string = await prettify(css`
  ${mainStyles}
  ${widthStyles}
`);

export default styles;
