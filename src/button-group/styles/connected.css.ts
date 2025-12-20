import { css, prettify } from '../../core/tokens/css.ts';
import { attribute, selector } from '../../core/tokens/selector.ts';
import packs from './tokens.ts';

const _styles = Object.entries(packs.connected)
  .filter(([size]) => size !== 'small')
  .map(([size, pack]) => {
    const host = selector(':host', attribute('size', size));

    return css`
      ${host} {
        ${pack.default};
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

    ::slotted(:active),
    ::slotted([checked]) {
      --_container-shape: var(--_shape-full);
      --_inner-corner-corner-size: var(--_container-shape);
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
