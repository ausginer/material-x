import { useShadowDOM } from '@ydinjs/core/controllers/useShadowDOM.js';
import { internals, type ControlledElement } from '@ydinjs/core/element.js';

// oxlint-disable-next-line max-params
export function useCore(
  host: ControlledElement,
  templates: readonly HTMLTemplateElement[],
  aria: Partial<ARIAMixin>,
  styles: ReadonlyArray<CSSStyleSheet | string>,
  init?: Partial<ShadowRootInit>,
): void {
  Object.assign(internals(host), aria);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  useShadowDOM(host, templates, styles as readonly CSSStyleSheet[], init);
}

/**
 * Makes `host.focus()` focus `control`, the element that delegating focus picks.
 * Firefox doesn't delegate focus from a host whose box is `display: contents`,
 * which every caller's host is, so the shadow root's `delegatesFocus` alone
 * leaves focus where it was there (`repo:RF-33`). The shadow root still
 * delegates focus, and this can go once Firefox delegates through such a host.
 */
export function forwardFocus(host: HTMLElement, control: HTMLElement): void {
  host.focus = (options) => {
    control.focus(options);
  };
}
