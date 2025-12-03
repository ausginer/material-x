import { css, prettify } from '../../../core/tokens/css.ts';
import { state } from '../utils.ts';
import packs from './tokens.ts';

const styles: string = await prettify(css`
  ${state.default()} {
    ${packs.default};

    --_shape-full: calc(var(--_container-height) / 2);
    --_padding-block: calc(
      (
          var(--_container-height) - max(
              var(--_icon-size),
              var(--_label-text-line-height)
            )
        ) /
        2
    );

    display: inline-flex;
    cursor: default;
    user-select: none;
    background-color: var(--_container-color);
    color: var(--_label-text-color);
    padding-block: var(--_padding-block);
    padding-inline: var(--_leading-space) var(--_trailing-space);
    border-radius: var(--_container-shape);
    font-weight: var(--_label-text-font-weight);
    font-size: var(--_label-text-font-size);
    line-height: var(--_label-text-line-height);
    font-family: var(--_label-text-font-name);
    place-items: center;
    place-content: center;
    gap: 8px;
    text-align: center;
    caret-color: transparent;

    transition:
      border-radius var(--_press-duration) var(--_press-easing),
      background-color var(--_press-duration) var(--_press-easing),
      color var(--_press-duration) var(--_press-easing),
      padding-inline var(--_press-duration) var(--_press-easing);
  }

  ${state.hovered()} {
    ${packs.hovered};

    background-color: var(--_container-color);
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

  .icon {
    --md-icon-size: var(--_icon-size);

    color: var(--_icon-color);
    flex: 1 0 var(--_icon-size);
    transition: color var(--_press-duration) var(--_press-easing);
    pointer-events: none;
  }
`);

export default styles;
