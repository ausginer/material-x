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

export type ARIAConverter = (
  name: string,
  value: string | null,
) => string | null;

export function useARIA(
  host: ReactiveElement,
  target: Partial<ARIAMixin>,
  mapping: Readonly<Record<string, keyof ARIAStringProperties>>,
  converter: ARIAConverter,
): void {
  for (const mappingName of Object.values(mapping)) {
    target[mappingName] = converter(mappingName, null);
  }

  use(host, {
    attrChanged(name, _, newValue) {
      if (mapping[name]) {
        target[mapping[name]] = converter(mapping[name], newValue);
      }
    },
  });
}

export function useARIAInternals(
  host: ReactiveElement,
  init: Partial<ARIAMixin>,
  mapping: Readonly<Record<string, keyof ARIAStringProperties>>,
  converter: ARIAConverter,
): void {
  const _internals = Object.assign(getInternals(host), init);
  useARIA(host, _internals, mapping, converter);
}
