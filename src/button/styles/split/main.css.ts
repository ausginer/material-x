import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute, pseudoClass } from '../../../core/tokens/selector.ts';
import { buttonStates, state } from '../utils.ts';
import packs, { defaults } from './tokens.ts';

const noAttribute = pseudoClass('not', attribute('size'));

const _styles = Object.entries(packs).flatMap(([name, pack]) => {
  const size = attribute('size', name);
  const sizeState = pseudoClass('state', name);

  return buttonStates.map((s) => {
    if (!pack[s]) {
      return null;
    }

    return css`
      ${state[s](size)}, ${state[s](sizeState, noAttribute)} {
        ${pack[s]};
      }
    `;
  });
});

const styles: string = await prettify(css`
  :host {
    ${defaults};

    display: contents;
  }

  ${_styles}

  mx-icon-button {
    transition: border-radius var(--_menu-button-press-duration)
      var(--_menu-button-press-easing);

    &:active,
    :host([open]) & {
      --_container-shape: var(--_shape-full);
      --_inner-corner-corner-size: var(--_shape-full);
    }
  }

  mx-button {
    --md-button-leading-space: var(--_leading-button-leading-space);
    --md-button-trailing-space: var(--_leading-button-trailing-space);
  }

  mx-icon-button {
    --md-button-leading-space: var(--_trailing-button-leading-space);
    --md-button-trailing-space: var(--_trailing-button-trailing-space);
  }

  mx-icon {
    --md-icon-size: var(--_trailing-button-icon-size);

    transition: transform var(--_menu-button-press-duration)
      var(--_menu-button-press-easing);

    &:active,
    :host([open]) & {
      transform: rotate(180deg);
    }
  }
`);

export default styles;
