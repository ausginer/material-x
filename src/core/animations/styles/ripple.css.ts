import { css, prettify } from '../../tokens/css.ts';

const styles: string = await prettify(css`
  :host {
    position: relative;
  }
  
  #ripple {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    pointer-events: none;
    -webkit-tap-highlight-color: transparent;
  
    &::before,
    &::after {
      content: '';
      position: absolute;
      opacity: 0;
      inset: 0;
    }
  
    &::before {
      will-change: opacity, background-color;
      background-color: var(--_ripple-color);
      transition:
        opacity 15ms linear,
        background-color 15ms linear;
    }
  
    :host(:hover) &::before {
      background-color: var(--_ripple-color);
      opacity: var(--_ripple-opacity);
    }
  
    &::after {
      will-change: transform, inset, opacity, background-image;
      width: 0;
      height: 0;
      background-image: radial-gradient(
        circle closest-side,
        var(--_ripple-color) max(calc(100% - 70px), 65%),
        transparent 100%
      );
      transform-origin: center center;
    }
  
    :host(:active) &::after {
      opacity: var(--_ripple-opacity);
    }
  
    :host([disabled]) & {
      display: none;
    }
  
    @media (forced-colors: active) {
      & {
        display: none;
      }
    }
  }
`);

export default styles;
