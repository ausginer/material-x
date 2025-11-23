import { css, prettify } from '../../core/tokens/css.ts';
import { attribute } from '../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs from './tokens.ts';

const { selected, unselected } = packs;

const checked = attribute('checked');

const switchStyles = [
  unselected &&
    buttonStates.map((s) =>
      s === 'default'
        ? css`
            ${state.default()} {
              ${unselected.default};
              --_container-color-applied: color-mix(
                in srgb,
                var(--_container-color) calc(100% - 100% * var(--_press-factor)),
                var(--_container-color-reverse)
                  calc(100% * var(--_press-factor))
              );
              --_label-text-color-applied: color-mix(
                in srgb,
                var(--_label-text-color)
                  calc(100% - 100% * var(--_press-factor)),
                var(--_label-text-color-reverse)
                  calc(100% * var(--_press-factor))
              );

              will-change: background-color, color;
            }
          `
        : unselected[s]
          ? css`
              ${state[s]()} {
                ${unselected[s]};
              }
            `
          : null,
    ),
  selected &&
    buttonStates.map((s) =>
      selected[s]
        ? css`
            ${state[s](checked)} {
              ${selected[s]};
            }
          `
        : null,
    ),
].flat();

const styles: string = await prettify(css`
  ${switchStyles}
`);

export default styles;
