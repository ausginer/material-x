import { css, prettify } from '../../core/tokens/css.ts';
import { state } from '../utils.ts';
import packs from './tokens.ts';

const styles: string = await prettify(css`
  ${state.default()} {
    ${packs.default};

    /* Intermediate variables for correct mx-switch-button color change logic */
    --_container-color-dyn: var(--_container-color);
    --_label-text-color-dyn: var(--_label-text-color);

    display: inline-flex;
    will-change: border-radius;
    cursor: default;
    user-select: none;
    background-color: var(--_container-color-dyn);
    color: var(--_label-text-color-dyn);
    padding-block: var(--_padding-block);
    padding-inline: var(--_leading-space) var(--_trailing-space);
    border-radius: calc(
      var(--_container-shape-default) -
        (var(--_container-shape-default) - var(--_container-shape-pressed)) *
        var(--_press-factor)
    );
    font-weight: var(--_label-text-font-weight);
    font-size: var(--_label-text-font-size);
    line-height: var(--_label-text-line-height);
    font-family: var(--_label-text-font-name);
    place-items: center;
    place-content: center;
    gap: 8px;
  }

  ${state.hovered()} {
    ${packs.hovered};

    background-color: color-mix(
      in srgb,
      var(--_container-color-dyn),
      var(--_state-layer-color) calc(var(--_state-layer-opacity) * 100%)
    );
  }

  ${state.focused()} {
    ${packs.focused};

    outline: var(--_focus-indicator-thickness) solid
      var(--_focus-indicator-color);
    outline-offset: var(--_focus-indicator-outline-offset);
  }

  ${state.pressed()} {
    ${packs.pressed};
  }

  slot[name='icon'],
  :host(:is(mx-icon-button)) slot {
    --md-icon-size: var(--_icon-size);

    color: var(--_icon-color);
    flex: 1 0 var(--_icon-size);
  }
`);

export default styles;
