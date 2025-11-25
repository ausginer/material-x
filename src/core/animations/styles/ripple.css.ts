import { css, prettify } from '../../tokens/css.ts';

const styles: string = await prettify(css`
  :host {
    position: relative;
  }

  .ripple {
    position: absolute;
    overflow: hidden;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    pointer-events: none;

    &::after {
      will-change: transform, width, height, background-image;
      content: '';
      position: absolute;
      opacity: 0;
      top: 0;
      left: 0;
      width: var(--_ripple-size, 0px);
      height: var(--_ripple-size, 0px);
      background-image: radial-gradient(
        circle closest-side,
        var(--_ripple-color) max(calc(100% - 70px), 65%),
        transparent 100%
      );
      transform-origin: center center;
    }

    :host(:active) & {
      &::after {
        opacity: var(--_ripple-opacity);
      }
    }
  }
`);

export default styles;
