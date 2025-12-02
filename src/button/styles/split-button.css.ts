import { css, prettify } from '../../core/tokens/css.ts';

const styles: string = await prettify(css`
  :host([open]) {
    mx-icon-button {
      --_inner-corner-corner-size: var(--_container-shape);
    }
  }
`);

export default styles;
