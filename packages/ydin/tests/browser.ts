import { expect } from 'vitest';
import { ControlledElement } from '../src/element.ts';

let nextCustomElementId = 0;

export function cleanupDOM(): void {
  document.body.replaceChildren();
}

export function nameCE(): string {
  nextCustomElementId += 1;
  return `test-${nextCustomElementId}`;
}

export function defineCE(
  name: string,
  element: CustomElementConstructor,
): void {
  customElements.define(name, element);
}

export function host(
  observed: readonly string[],
  init: (instance: ControlledElement) => void,
  tag: string = nameCE(),
): ControlledElement {
  class Host extends ControlledElement {
    static observedAttributes = observed;

    constructor() {
      super();
      init(this);
    }
  }

  defineCE(tag, Host);

  return new Host();
}

export async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function matcher(html: string): object {
  return expect.objectContaining({ outerHTML: html });
}

export async function flushDOM(): Promise<void> {
  await Promise.resolve();
  await nextFrame();
  await Promise.resolve();
}
