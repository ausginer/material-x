import { useAria } from './useAria.ts';
import { type ReactiveElement } from '../elements/reactive-element.ts';
import { useShadowDOM } from './useShadowDOM.ts';

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
