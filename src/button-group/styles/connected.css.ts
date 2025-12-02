import { css, prettify } from '../../core/tokens/css.ts';
import { attribute, selector } from '../../core/tokens/selector.ts';
import type { TypedObjectConstructor } from '../../interfaces.ts';
import packs, { buttonGroupStates, state } from './tokens.ts';

const _styles = (Object as TypedObjectConstructor)
  .entries(packs.connected)
  .filter(([size]) => size !== 'small')
  .map(([size, pack]) => {
    const host = selector(':host', attribute('size', size));

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
  });

const styles: string = await prettify(css`
  :host {
    ${packs.connected.small.default};

    display: flex;
    gap: var(--_between-space);

    ::slotted(*) {
      border-radius: var(--_inner-corner-corner-size);
    }

    ::slotted(*:first-of-type) {
      border-start-start-radius: var(--_container-shape);
      border-end-start-radius: var(--_container-shape);
    }

    ::slotted(*:last-of-type) {
      border-start-end-radius: var(--_container-shape);
      border-end-end-radius: var(--_container-shape);
    }
  }

  :host(:active) {
    ${packs.connected.small.pressed};
  }

  ${_styles}
`);

export default styles;
