export function $(host: HTMLElement): ShadowRoot | null;
export function $<K extends keyof HTMLElementTagNameMap>(
  host: HTMLElement,
  selectors: K,
): HTMLElementTagNameMap[K] | null | undefined;
export function $<K extends keyof SVGElementTagNameMap>(
  host: HTMLElement,
  selectors: K,
): SVGElementTagNameMap[K] | null | undefined;
export function $<K extends keyof MathMLElementTagNameMap>(
  host: HTMLElement,
  selectors: K,
): MathMLElementTagNameMap[K] | null | undefined;
/** @deprecated */
export function $<K extends keyof HTMLElementDeprecatedTagNameMap>(
  host: HTMLElement,
  selectors: K,
): HTMLElementDeprecatedTagNameMap[K] | null | undefined;
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function $<E extends Element = Element>(
  host: HTMLElement,
  selectors: string,
): E | null | undefined;
export function $(
  host: HTMLElement,
  selectors?: string,
): ShadowRoot | Element | null | undefined {
  return selectors
    ? host.shadowRoot?.querySelector(selectors)
    : host.shadowRoot;
}
