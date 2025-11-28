import { css, prettify } from '../../../core/tokens/css.ts';
import { state } from '../../utils.ts';
import packs from './tokens.ts';

const styles: string = await prettify(css`
  ${state.default()} {
    ${packs.default};

    --_level: calc(
      var(--_elevation-default) +
        (var(--_elevation-hovered) - var(--_elevation-default)) *
        var(--_press-factor)
    );

    display: inline-flex;
    background-color: var(--_container-color);
    border-radius: var(--_container-shape);
    justify-content: center;
    align-items: center;
    padding-block: calc((var(--_container-height) - var(--_icon-size)) / 2);
    padding-inline: calc((var(--_container-width) - var(--_icon-size)) / 2);

    &::before,
    &::after {
      content: '';
    }
  }

  ${state.hovered()} {
    ${packs.hovered};
  }

  ${state.focused()} {
    ${packs.focused};
  }

  ${state.pressed()} {
    ${packs.pressed};
  }

  .icon {
    --md-icon-size: var(--_icon-size);

    color: var(--_icon-color);
  }
`);

export default styles;
