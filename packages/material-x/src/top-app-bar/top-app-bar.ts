import { ControlledElement, internals, use } from '@ydinjs/core/element.js';
import { toggleState } from '@ydinjs/core/utils/DOM.js';
import type { EmptyObject } from 'type-fest';
import { useHasSlottedPolyfill } from '../core/polyfills/has-slotted.ts';
import { useCore } from '../core/utils/useCore.ts';
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };
import template from './top-app-bar.tpl.html' with { type: 'html' };

export type TopAppBarProperties = EmptyObject;
export type TopAppBarEvents = EmptyObject;
export type TopAppBarCSSProperties = Readonly<{
  '--md-top-app-bar-container-color'?: string;
  '--md-top-app-bar-on-scroll-container-color'?: string;
}>;

/*
 * `root` is the document, because with the default root a frame's observer
 * measures against the outermost page. The margins make the area everything
 * above the viewport, so a target that isn't rendered reads as one at the
 * document's start. The side margins are larger than a page, so that scrolling
 * sideways doesn't move the target out of the area. The top one is the length
 * that the state follows in one jump, and isn't larger, because with
 * 100000000px WebKit misses the first pixel. The threshold is above 0, because the target touches the area
 * at the start, and a touch isn't a crossing.
 */
const SCROLL_OBSERVER_OPTIONS: IntersectionObserverInit = {
  root: document,
  rootMargin: '10000000px 1000000px -100%',
  threshold: 1e-9,
};

/**
 * @tag mx-top-app-bar
 *
 * @summary Top app bars display a page's headline, navigation and actions.
 *
 * The bar pins itself to the block start of the page while its parent is in
 * view, so it belongs directly in the page's `body`, or in an element as tall
 * as the page. It has no role: set `role="banner"` on the page's own bar. Set
 * `scroll-padding-block-start` on the page's scroller, so that the bar doesn't
 * cover focused and targeted content.
 *
 * @slot - The headline, for example a heading.
 * @slot lead - The navigation icon.
 * @slot trail - The actions.
 *
 * @cssstate scrolled - The bar is rendered, and the document is scrolled away
 * from its start.
 *
 * @cssprop --md-top-app-bar-container-color - Overrides the container color at the document's start.
 * @cssprop --md-top-app-bar-on-scroll-container-color - Overrides the container color while the document is scrolled.
 */
export default class TopAppBar extends ControlledElement {
  constructor() {
    super();
    useCore(this, [template], {}, [defaultStyles]);
    useHasSlottedPolyfill(this);

    // The popover is in the top layer, where the page's styles don't move it and
    // its containing block is the document's initial one rather than the host.
    const scrollStart =
      this.shadowRoot!.querySelector<HTMLElement>('.scroll-start')!;
    const observer = new IntersectionObserver((entries) => {
      toggleState(
        internals(this),
        'scrolled',
        entries.at(-1)!.boundingClientRect.top < 0,
      );
    }, SCROLL_OBSERVER_OPTIONS);

    use(this, {
      connected() {
        // Another element's connect callback can have removed the host already,
        // and a disconnected popover can't be shown.
        if (scrollStart.isConnected) {
          // A disconnect hides the popover.
          scrollStart.showPopover();
          observer.observe(scrollStart);
        }
      },
      disconnected() {
        observer.disconnect();
      },
    });
  }
}

customElements.define('mx-top-app-bar', TopAppBar);

declare global {
  interface HTMLElementTagNameMap {
    'mx-top-app-bar': TopAppBar;
  }
}
