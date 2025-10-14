import { css, prettify } from '../../../core/tokens/css.ts';
import { state } from '../../utils.ts';
import packs from './tokens.ts';

const styles: string = await prettify(css`
  ${state.disabled()} {
    ${packs.disabled};

    background-color: color-mix(
      in srgb,
      var(--_container-color),
      transparent calc(100% - var(--_container-opacity) * 100%)
    );
    color: color-mix(
      in srgb,
      var(--_label-text-color),
      transparent calc(100% - var(--_label-text-opacity) * 100%)
    );
    cursor: default;
    pointer-events: none;
    outline: none;

    slot[name='icon'] {
      color: color-mix(
        in srgb,
        var(--_icon-color),
        transparent calc(100% - var(--_icon-opacity) * 100%)
      );
    }
  }
`);

console.log(styles);

export default styles;
