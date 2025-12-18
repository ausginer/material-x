import { useARIA } from '../controllers/useARIA.ts';
import { useShadowDOM } from '../controllers/useShadowDOM.ts';
import type { ReactiveElement } from '../elements/reactive-element.ts';

const ARIA_MAPPING = {
  checked: 'ariaChecked',
  disabled: 'ariaDisabled',
} as const;

// eslint-disable-next-line @typescript-eslint/max-params
export function useCore(
  host: ReactiveElement,
  template: HTMLTemplateElement,
  aria: Partial<ARIAMixin>,
  styles: CSSStyleSheet[],
  init?: Partial<ShadowRootInit>,
): void {
  useShadowDOM(host, template, styles, init);
  useARIA(host, aria, ARIA_MAPPING);
}
