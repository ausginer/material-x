import type { ReactiveElement } from '../elements/reactive-element.ts';
import { useAria } from './useAria.ts';
import { useShadowDOM } from './useShadowDOM.ts';

// eslint-disable-next-line @typescript-eslint/max-params
export function useCore(
  element: ReactiveElement,
  template: HTMLTemplateElement,
  aria: Partial<ARIAMixin>,
  styles: CSSStyleSheet[],
  init?: Partial<ShadowRootInit>,
): void {
  useShadowDOM(element, template, styles, init);
  useAria(element, aria);
}
