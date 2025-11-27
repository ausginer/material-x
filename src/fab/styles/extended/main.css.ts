import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute } from '../../../core/tokens/selector.ts';
import type { TypedObjectConstructor } from '../../../interfaces.ts';
import { fabStates, state } from '../../utils.ts';
import packs, { DEFAULTS, openPack, variantAttribute } from './tokens.ts';

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

    will-change: gap;
    color: var(--_label-text-color);
    font-size: var(--_label-text-font-size);
    line-height: var(--_label-text-line-height);
    font-family: var(--_label-text-font-name);
    font-weight: var(--_label-text-font-weight);
    gap: calc(var(--_icon-label-space) * var(--_interaction-factor));
    flex-direction: var(--_direction);
    cursor: default;
    user-select: none;
    transition: --_interaction-factor var(--_press-duration)
      var(--_press-easing);

    slot:not([name='icon']) {
      will-change: font-size;
      display: block;
      white-space: nowrap;
      font-size: calc(
        var(--_label-text-font-size) * var(--_interaction-factor)
      );

      @supports (width: calc-size(min-content, size)) {
        will-change: max-width;
        font-size: var(--_label-text-font-size);
        max-width: calc-size(min-content, size * var(--_interaction-factor));
        overflow: hidden;
      }
    }
  }

  ${state.default(extendedOpen)} {
    ${openPack};
  }

  ${state.default(extended, attribute('tonal'))} {
    ${packs['tertiary-container'].default};
  }

  ${parts}
`);

export default styles;
