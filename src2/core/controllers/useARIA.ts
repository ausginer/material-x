import {
  getInternals,
  use,
  type ReactiveElement,
} from '../elements/reactive-element.ts';

export type ARIAStringProperties = Readonly<{
  [K in keyof ARIAMixin as ARIAMixin[K] extends string | null
    ? K
    : never]: ARIAMixin[K];
}>;

export function useARIA(
  host: ReactiveElement,
  init: Partial<ARIAMixin>,
  mapping: Readonly<Record<string, keyof ARIAStringProperties>>,
): void {
  const _internals = Object.assign(getInternals(host), init);
  use(host, {
    attrChanged(name: string, _, newValue) {
      if (mapping[name]) {
        _internals[mapping[name]] = newValue;
      }
    },
  });
}
