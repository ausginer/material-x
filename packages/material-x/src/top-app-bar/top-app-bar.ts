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
 * Leaves only the area above the scroll start. The top and side margins are
 * larger than a page, because the root element's box can be as small as the
 * viewport: a page with `html { height: 100% }`, or one scrolled sideways, moves
 * it out of an area with smaller margins. `root` is the document, because with
 * the default root a frame's observer measures against the outermost page.
 */
const SCROLL_OBSERVER_OPTIONS: IntersectionObserverInit = {
  root: document,
  rootMargin: '1000000px 1000000px -100%',
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
 * @cssstate scrolled - The document is scrolled away from its start.
 *
 * @cssprop --md-top-app-bar-container-color - Overrides the container color at the document's start.
 * @cssprop --md-top-app-bar-on-scroll-container-color - Overrides the container color while the document is scrolled.
 */
export default class TopAppBar extends ControlledElement {
  constructor() {
    super();
    useCore(this, [template], {}, [defaultStyles]);
    useHasSlottedPolyfill(this);

    const observer = new IntersectionObserver((entries) => {
      toggleState(
        internals(this),
        'scrolled',
        entries.at(-1)!.intersectionRatio > 0,
      );
    }, SCROLL_OBSERVER_OPTIONS);

    use(this, {
      connected() {
        observer.observe(document.documentElement);
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
