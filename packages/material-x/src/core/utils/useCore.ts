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
