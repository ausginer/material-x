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
    --_interaction-factor-applied: var(--_interaction-factor, 0);

    display: flex;
    gap: var(--_between-space);
    transition: --_interaction-factor var(--_interaction-duration)
      var(--_interaction-easing);

    ::slotted(*) {
      padding-inline: calc(
          var(--_leading-space) + var(--_interaction-direction-leading) *
            var(--_leading-space) * var(--_interaction-width-multiplier) *
            var(--_interaction-factor-applied)
        )
        calc(
          var(--_trailing-space) + var(--_interaction-direction-trailing) *
            var(--_trailing-space) * var(--_interaction-width-multiplier) *
            var(--_interaction-factor-applied)
        );
    }

    ::slotted(:active),
    ::slotted(:focus) {
      --_interaction-direction-leading: 1;
      --_interaction-direction-trailing: 1;
    }
  }

  :host(:active) {
    ${packs.standard.small.pressed};
  }

  ${_styles}
`);

export default styles;
