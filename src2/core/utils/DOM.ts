import type {
  SiblingUpdateCallback,
  ExistingSiblingUpdateCallback,
} from '../../../src/button-group/utils.ts';

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
  selectors: string,
): Element | null | undefined {
  return host.shadowRoot?.querySelector(selectors);
}

export function $$<K extends keyof HTMLElementTagNameMap>(
  host: HTMLElement,
  selectors: K,
): NodeListOf<HTMLElementTagNameMap[K]> | undefined;
export function $$<K extends keyof SVGElementTagNameMap>(
  host: HTMLElement,
  selectors: K,
): NodeListOf<SVGElementTagNameMap[K]> | undefined;
export function $$<K extends keyof MathMLElementTagNameMap>(
  host: HTMLElement,
  selectors: K,
): NodeListOf<MathMLElementTagNameMap[K]> | undefined;
/** @deprecated */
export function $$<K extends keyof HTMLElementDeprecatedTagNameMap>(
  host: HTMLElement,
  selectors: K,
): NodeListOf<HTMLElementDeprecatedTagNameMap[K]> | undefined;
export function $$<E extends Element = Element>(
  host: HTMLElement,
  selectors: string,
): NodeListOf<E> | undefined;
export function $$(
  host: HTMLElement,
  selectors: string,
): NodeListOf<Element> | undefined {
  return host.shadowRoot?.querySelectorAll(selectors);
}

export function applyToSiblings(
  target: HTMLElement,
  prev?: SiblingUpdateCallback | null,
  next?: SiblingUpdateCallback | null,
): void;
export function applyToSiblings(
  target: HTMLElement,
  prev: ExistingSiblingUpdateCallback | undefined | null,
  next: ExistingSiblingUpdateCallback | undefined | null,
  shouldCheckExistence: true,
): void;
export function applyToSiblings(
  target: HTMLElement,
  prev?: SiblingUpdateCallback | ExistingSiblingUpdateCallback | null,
  next?: SiblingUpdateCallback | ExistingSiblingUpdateCallback | null,
  shouldCheckExistence = false,
): void {
  const update = (
    node: Element | null,
    callback?: SiblingUpdateCallback | ExistingSiblingUpdateCallback | null,
  ) => {
    const element = node instanceof HTMLElement ? node : undefined;
    if (!shouldCheckExistence || element) callback?.(element!);
  };

  update(target.previousElementSibling, prev);
  update(target.nextElementSibling, next);
}
