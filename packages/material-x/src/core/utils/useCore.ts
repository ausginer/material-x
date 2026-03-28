import { useShadowDOM } from 'ydin/controllers/useShadowDOM.js';
import { useAttributes } from 'ydin/controllers/useAttributes.js';
import type { ControlledElement } from 'ydin/element.js';
import { getInternals } from 'ydin/element.js';

// oxlint-disable-next-line max-params
export function useCore(
  host: ControlledElement,
  templates: readonly HTMLTemplateElement[],
  aria: Partial<ARIAMixin>,
  styles: ReadonlyArray<CSSStyleSheet | string>,
  init?: Partial<ShadowRootInit>,
): void {
  Object.assign(getInternals(host), aria);
  useShadowDOM(host, templates, styles as readonly CSSStyleSheet[], init);
}
