import type { Constructor } from 'type-fest';
import { expect } from 'vitest';
import {
  ControlledElement,
  type ControlledElementConstructor,
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

export type HostOptions<T extends ControlledElement> = Readonly<{
  observed?: readonly string[];
  init?(instance: T): void;
  tag?: string;
}>;

export function host(
  options: HostOptions<ControlledElement>,
): ControlledElement;
export function host<T extends ControlledElement>(
  options: HostOptions<T>,
  base: Constructor<T> & CustomElementStatics,
): T;
export function host(
  {
    observed = [],
    init = () => {},
    tag = nameCE(),
  }: HostOptions<ControlledElement>,
  base: ControlledElementConstructor = ControlledElement,
): ControlledElement {
  class Host extends base {
    static override observedAttributes = [
      ...(base.observedAttributes ?? []),
      ...observed,
    ];

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
