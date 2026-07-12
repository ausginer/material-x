/**
 * Shared browser-side helpers for Material X component tests.
 *
 * This is the single home for cross-test browser utilities (the material-x
 * analogue of `packages/ydin/tests/browser.ts`): frame/font/upgrade
 * synchronization, and the normalization the visual-contract layer relies on —
 * turning a tproc-emitted CSS string (which may contain `var()`, a colour, a
 * font list, or a length) into the exact serialization the browser produces for
 * the rendered element, so an expected token value can be compared against an
 * independent browser observation without reimplementing per-component
 * conversion.
 */

/** Resolves after the next animation frame, so slot/layout updates settle. */
export async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/** Parses a CSS pixel string (`"40px"`) into its numeric value. */
export function pixels(value: string | number): number {
  if (typeof value !== 'string' || !value.endsWith('px')) {
    throw new Error(`Expected a CSS pixel value, received ${String(value)}`);
  }

  return Number.parseFloat(value);
}

/**
 * Resolves a CSS value the browser way: applies `value` to `property` on a
 * throwaway element mounted in the live document (so it inherits the same theme
 * custom properties and font overrides as the component under test) and returns
 * the computed serialization. This canonicalizes `var()`, colours, font lists,
 * and lengths identically to how the browser resolved the rendered element,
 * which is what makes an expected-token vs. actual-render comparison valid.
 */
export function resolveComputed(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);

  const computed = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();

  return computed;
}

/** Resolves when the element's custom-element definition has upgraded. */
export async function whenUpgraded(element: HTMLElement): Promise<void> {
  await customElements.whenDefined(element.localName);
}

/** Resolves when web fonts have settled, so geometry/raster is stable. */
export async function whenFontsReady(): Promise<void> {
  await document.fonts.ready;
}
