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

              will-change: background-color, color;
              transition-property: background-color, color;
              transition-duration: var(--_switch-duration);
              transition-timing-function: var(--_switch-easing);
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
