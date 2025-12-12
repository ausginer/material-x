import type { ReactiveElement } from '../elements/reactive-element.ts';
import { useAria } from './useAria.ts';
import { useShadowDOM } from './useShadowDOM.ts';

// eslint-disable-next-line @typescript-eslint/max-params
export function useCore(
  host: ReactiveElement,
  template: HTMLTemplateElement,
  aria: Partial<ARIAMixin>,
  styles: CSSStyleSheet[],
  init?: Partial<ShadowRootInit>,
): void {
  useShadowDOM(host, template, styles, init);
  useAria(host, aria);
}
