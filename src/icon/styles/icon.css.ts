import { css } from '../../core/tokens/css.ts';

const styles: string = css`
  :host {
    font-size: var(--md-icon-size, 20px);
    width: var(--md-icon-size, 20px);
    height: var(--md-icon-size, 20px);
    color: inherit;
    font-variation-settings: inherit;
    font-weight: 400;
    font-family: var(--md-icon-font, 'Material Symbols Outlined');
    display: inline-flex;
    font-style: normal;
    place-items: center;
    place-content: center;
    line-height: 1;
    overflow: hidden;
    letter-spacing: normal;
    text-transform: none;
    user-select: none;
    white-space: nowrap;
    word-wrap: normal;
    flex-shrink: 0;

    /* Support for all WebKit browsers. */
    -webkit-font-smoothing: antialiased;

    /*  Support for Safari and Chrome. */
    text-rendering: optimizelegibility;

    /* Support for Firefox. */
    -moz-osx-font-smoothing: grayscale;
  }
`;

export default styles;
