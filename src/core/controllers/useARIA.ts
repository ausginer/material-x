import { ATTRIBUTE } from '../elements/attribute.ts';
import {
  getInternals,
  use,
  type ReactiveElement,
} from '../elements/reactive-element.ts';
import { useMutationObserver } from './useMutationObserver.ts';

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

export type ARIATransferTransformer = (
  name: string,
  value: string | null,
) => string | null;

export function useARIATransfer(
  host: ReactiveElement,
  target: HTMLElement,
  transform: ARIATransferTransformer = (_, value) => value,
): void {
  const syncAttribute = (name: string) => {
    if (name.startsWith('aria-')) {
      ATTRIBUTE.setRaw(
        target,
        name,
        transform(name, ATTRIBUTE.getRaw(host, name)),
      );
    }
  };

  useMutationObserver(host, {
    attributes: true,
    callback(records) {
      for (const { type, attributeName } of records) {
        if (type === 'attributes' && attributeName) {
          syncAttribute(attributeName);
        }
      }
    },
    connected() {
      for (const { name } of Array.from(host.attributes)) {
        syncAttribute(name);
      }
    },
  });
}
