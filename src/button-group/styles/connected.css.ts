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
    --_shape-full: calc(var(--_container-height) / 2);

    display: flex;
    gap: var(--_between-space);

    ::slotted(*) {
      border-radius: var(--_inner-corner-corner-size);
    }

    ::slotted(:active) {
      ${packs.connected.small.pressed};
    }

    ::slotted([data-first]) {
      border-start-start-radius: var(--_container-shape);
      border-end-start-radius: var(--_container-shape);
    }

    ::slotted([data-last]) {
      border-start-end-radius: var(--_container-shape);
      border-end-end-radius: var(--_container-shape);
    }
  }

  ${_styles}
`);

export default styles;
