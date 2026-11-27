export function label(text: string): HTMLElement {
  const element = document.createElement('span');
  element.textContent = text;
  return element;
}
