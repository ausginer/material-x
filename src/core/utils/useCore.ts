import { useARIA, useARIAInternals } from '../controllers/useARIA.ts';
import { useShadowDOM } from '../controllers/useShadowDOM.ts';
import type { ReactiveElement } from '../elements/reactive-element.ts';

const ARIA_MAPPING = {
  checked: 'ariaChecked',
} as const;

function converter(name: string, value: string | null): string | null {
  if (name === 'ariaChecked') {
    return value != null ? 'true' : 'false';
  }

  return value;
}

// eslint-disable-next-line @typescript-eslint/max-params
export function useCore(
  host: ReactiveElement,
  template: HTMLTemplateElement,
  aria: Partial<ARIAMixin>,
  styles: CSSStyleSheet[],
  init?: Partial<ShadowRootInit>,
): void {
  useShadowDOM(host, template, styles, init);
  useARIAInternals(host, aria, ARIA_MAPPING, converter);
}

export function useTargetedARIA(
  host: ReactiveElement,
  target: HTMLElement,
): void {
  useARIA(host, target, ARIA_MAPPING, converter);
}
