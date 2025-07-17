export function getNumberValue(
  styles: CSSStyleDeclaration,
  property: string,
): number {
  return parseFloat(styles.getPropertyValue(property).trim());
}

export function listen(
  element: HTMLElement,
  event: string,
  callback: EventListener,
  options?: boolean | AddEventListenerOptions,
): void {
  element.addEventListener(event, callback, options);
}
