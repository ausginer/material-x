import type { ControlledElement } from '@ydinjs/core/element.js';
import css from './aria-notify.ctr.css' with { type: 'css' };
import template from './aria-notify.tpl.html' with { type: 'html' };

/**
 * Adds a polite live region to `host`'s shadow root, and returns the function
 * that writes a message into it.
 */
// TODO: Replace with `Element.ariaNotify` and delete this module once
// Playwright's WebKit has the method and a check with VoiceOver passes.
export function useAriaNotifyPolyfill(
  host: ControlledElement,
): (message: string) => void {
  const root = host.shadowRoot!;
  root.adoptedStyleSheets.push(css);
  root.append(template.content.cloneNode(true));

  const region = root.querySelector<HTMLElement>('.aria-notify')!;

  return (message) => {
    region.textContent = message;
  };
}
