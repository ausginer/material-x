import { css, prettify } from '../../core/tokens/css.ts';

const styles: string = await prettify(css`
  :host {
    padding: 0;
  }

  :host(:focus-visible) {
    outline: none;
  }

  a {
    border-radius: inherit;
    color: inherit;
    cursor: inherit;
    text-decoration: inherit;
    padding-block: var(--_padding-block);
    padding-inline: var(--_leading-space) var(--_trailing-space);
    user-select: none;
    display: inherit;
    gap: inherit;
    place-items: inherit;
    place-content: inherit;
  }

  a:focus-visible {
    outline: var(--_focus-indicator-thickness) solid
      var(--_focus-indicator-color);
    outline-offset: var(--_focus-indicator-outline-offset);
  }
`);

export default styles;
