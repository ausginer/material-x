import css from '../../core/tokens/css.ts';
import { state } from '../utils.ts';
import packs from './tokens.ts';

if (!packs) {
  throw new Error('No tokens available for button component.');
}

const styles: string = await css`
  ${state.default()} {
    ${packs.default};
    will-change: border-radius;
    display: inline-flex;
    cursor: default;
    user-select: none;
    background-color: var(--_container-color);
    color: var(--_label-text-color);
    padding-block: var(--_padding-block);
    padding-inline-start: var(--_leading-space);
    padding-inline-end: var(--_trailing-space);
    border-radius: calc(
      var(--_container-shape-default) -
        (var(--_container-shape-default) - var(--_container-shape-pressed)) *
        var(--_press-factor)
    );
    font-weight: var(--_label-text-weight);
    font-size: var(--_label-text-size);
    line-height: var(--_label-text-line-height);
    font-family: var(--_label-text-font);
    place-items: center;
    place-content: center;
    gap: 8px;
  }

  ${state.hovered()} {
    ${packs.hovered};
    background-color: color-mix(
      in srgb,
      var(--_container-color),
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

  slot[name='icon'] {
    --md-icon-size: var(--_icon-size);

    color: var(--_icon-color);
    flex: 1 0 var(--_icon-size);
  }
`;

console.log(styles);
export default styles;
