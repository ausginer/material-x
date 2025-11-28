import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute } from '../../../core/tokens/selector.ts';
import type { TypedObjectConstructor } from '../../../interfaces.ts';
import { fabStates, state } from '../../utils.ts';
import packs, { DEFAULTS, variantAttribute } from './tokens.ts';

const extended = attribute('extended');
const extendedOpen = attribute('extended', 'open');

const parts = (Object as TypedObjectConstructor)
  .entries(packs)
  .flatMap(([name, pack]) => {
    const variant = variantAttribute(name);

    return fabStates.map((s) =>
      (DEFAULTS as readonly string[]).includes(name) && s === 'default'
        ? null
        : css`
            ${state[s](extended, ...variant)} {
              ${pack[s]};
            }
          `,
    );
  });

const styles: string = await prettify(css`
  ${state.default(extended)} {
    ${packs.tertiary.default};
    ${packs.small.default};

    color: var(--_label-text-color);
    line-height: var(--_label-text-line-height);
    font-family: var(--_label-text-font-name);
    font-weight: var(--_label-text-font-weight);
    flex-direction: var(--_direction);
    cursor: default;
    user-select: none;
    gap: 0;
    transition: gap var(--_unfold-duration) var(--_unfold-easing);

    slot:not(.icon) {
      display: block;
      opacity: 0;
      white-space: nowrap;
      overflow: hidden;
      font-size: 0;
      transition: var(--_unfold-duration) var(--_unfold-easing);
      transition-property: font-size, opacity;

      @supports (width: calc-size(min-content, size)) {
        width: 0;
        font-size: var(--_label-text-font-size);
        transition-property: width, opacity;
      }
    }
  }

  ${state.default(extendedOpen)} {
    gap: var(--_icon-label-space);

    slot:not(.icon) {
      opacity: 1;
      font-size: var(--_label-text-font-size);

      @supports (width: calc-size(min-content, size)) {
        width: calc-size(min-content, size);
      }
    }
  }

  ${state.default(extended, attribute('tonal'))} {
    ${packs['tertiary-container'].default};
  }

  ${parts}
`);

export default styles;
