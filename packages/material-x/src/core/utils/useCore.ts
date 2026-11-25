import { useShadowDOM } from '@ydinjs/core/controllers/useShadowDOM.js';
import { internals, type ControlledElement } from '@ydinjs/core/element.js';
import hostStyles from '../styles/host/host.css.ts' with { type: 'css' };

// oxlint-disable-next-line max-params
export function useCore(
  host: ControlledElement,
  templates: readonly HTMLTemplateElement[],
  aria: Partial<ARIAMixin>,
  styles: ReadonlyArray<CSSStyleSheet | string>,
  init?: Partial<ShadowRootInit>,
): void {
  Object.assign(internals(host), aria);
  useShadowDOM(
    host,
    templates,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    [...styles, hostStyles] as readonly CSSStyleSheet[],
    init,
  );
}
