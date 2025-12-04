import { css, prettify } from '../../core/tokens/css.ts';
import motionEffects from '../../core/tokens/default/motion-effects.ts';
import { resolveSet } from '../../core/tokens/resolve.ts';
import { createVariables, packSet } from '../../core/tokens/variable.ts';

const tokens = packSet(
  createVariables(
    resolveSet({
      'menu-button.press.easing': motionEffects['standard.fast-spatial'],
      'menu-button.press.duration':
        motionEffects['standard.fast-spatial.duration'],
    }),
  ),
);

const styles: string = await prettify(css`
  :host {
    ${tokens};

    display: contents;
  }

  mx-icon-button {
    transition: border-radius var(--_menu-button-press-duration)
      var(--_menu-button-press-easing);

    &:active,
    :host([open]) & {
      --_container-shape: var(--_shape-full);
      --_inner-corner-corner-size: var(--_shape-full);
    }
  }

  mx-icon {
    transition: transform var(--_menu-button-press-duration)
      var(--_menu-button-press-easing);

    &:active,
    :host([open]) & {
      transform: rotate(180deg);
    }
  }
`);

export default styles;
