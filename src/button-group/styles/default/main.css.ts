import { css, prettify } from '../../../core/tokens/css.ts';
import { attribute, selector } from '../../../core/tokens/selector.ts';
import type { TypedObjectConstructor } from '../../../interfaces.ts';
import packs, { buttonGroupStates, state } from './tokens.ts';

const _styles = (Object as TypedObjectConstructor)
  .entries(packs)
  .flatMap(([type, superpack]) =>
    (Object as TypedObjectConstructor)
      .entries(superpack)
      .filter(([size]) => !(type === 'standard' && size === 'small'))
      .map(([size, pack]) => {
        const host = selector(
          ':host',
          type === 'standard' ? null : attribute('type', type),
          attribute('size', size),
        );

        const vars = buttonGroupStates.map((s) => {
          if (!pack[s]) {
            return null;
          }

          if (s === 'default') {
            return pack[s];
          }

          return css`
            ${state[s]()} {
              ${pack[s]};
            }
          `;
        });

        return css`
          ${host} {
            ${vars};
          }
        `;
      }),
  );

const styles: string = await prettify(css`
  :host {
    ${packs.standard.small.default};
    --_interaction-direction-leading: 0;
    --_interaction-direction-trailing: 0;

    display: flex;
    gap: var(--_between-space);

    ::slotted(*) {
      padding-inline: calc(
          var(--_leading-space) *
            (
              1 + var(--_interaction-direction-leading) *
                var(--_interaction-width-multiplier)
            )
        )
        calc(
          var(--_trailing-space) *
            (
              1 + var(--_interaction-direction-trailing) *
                var(--_interaction-width-multiplier)
            )
        );
    }
  }

  :host(:active) {
    ${packs.standard.small.pressed};
  }

  ${_styles}
`);

export default styles;
