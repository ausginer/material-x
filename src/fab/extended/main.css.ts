import { css, prettify } from '../../core/tokens/css.ts';
import { attribute } from '../../core/tokens/selector.ts';
import { type TypedObjectConstructor } from '../../interfaces.ts';
import { fabStates, state } from '../utils.ts';
import packs, { DEFAULTS, variantAttribute } from './tokens.ts';

const extended = attribute('extended');

const parts = (Object as TypedObjectConstructor)
  .entries(packs)
  .flatMap(([name, pack]) => {
    const variant = variantAttribute(name);

    return fabStates.map((s) => {
      return (DEFAULTS as readonly string[]).includes(name) && s === 'default'
        ? null
        : css`
            ${state[s](extended, ...variant)} {
              ${pack[s]};
            }
          `;
    });
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
    gap: calc(var(--_icon-label-space) * var(--_unfold-factor));
    flex-direction: var(--_direction);
    cursor: default;
    user-select: none;

    slot:not([name='icon']) {
      will-change: font-size;
      display: block;
      white-space: nowrap;
      font-size: calc(var(--_label-text-size) * var(--_unfold-factor));

      @supports (width: calc-size(min-content, size)) {
        will-change: max-width;
        font-size: var(--_label-text-size);
        max-width: calc-size(min-content, size * var(--_unfold-factor));
        overflow: hidden;
      }
    }
  }

  ${state.default(extended, attribute('tonal'))} {
    ${packs['tertiary-container'].default};
  }

  ${parts}
`);

export default styles;
