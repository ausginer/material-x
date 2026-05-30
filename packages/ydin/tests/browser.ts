import type { Constructor } from 'type-fest';
import { expect } from 'vitest';
import {
  ControlledElement,
  type CustomElementStatics,
} from '../src/element.ts';

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

export type HostOptions = Readonly<{
  observed?: readonly string[];
  tag?: string;
}>;

export function host(
  init: (instance: ControlledElement) => void,
  options?: HostOptions,
): ControlledElement;
export function host<T extends ControlledElement>(
  init: (instance: T) => void,
  base: Constructor<T> & CustomElementStatics,
  options?: HostOptions,
): T;
export function host(
  init: (instance: ControlledElement) => void,
  baseOrOptions?:
    | (Constructor<ControlledElement> & CustomElementStatics)
    | HostOptions,
  options?: HostOptions,
): ControlledElement {
  let base: Constructor<ControlledElement> & CustomElementStatics;
  let opts: HostOptions | undefined;

  if (typeof baseOrOptions === 'function') {
    base = baseOrOptions;
    opts = options;
  } else {
    base = ControlledElement;
    opts = baseOrOptions;
  }

  class Host extends base {
    static override observedAttributes = [
      ...(base.observedAttributes ?? []),
      ...(opts?.observed ?? []),
    ];

    constructor() {
      super();
      init(this);
    }
  }

  defineCE(opts?.tag ?? nameCE(), Host);

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
