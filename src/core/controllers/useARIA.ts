import { ATTRIBUTE } from '../elements/attribute.ts';
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

export function useARIATransfer(
  host: ReactiveElement,
  target: HTMLElement,
): void {
  const syncAttribute = (name: string, value: string | null) => {
    if (name.startsWith('aria-')) {
      ATTRIBUTE.setRaw(target, name, value);
    }
  };

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes' && record.attributeName) {
        syncAttribute(
          record.attributeName,
          ATTRIBUTE.getRaw(host, record.attributeName),
        );
      }
    }
  });

  use(host, {
    connected() {
      for (const { name } of Array.from(host.attributes)) {
        syncAttribute(name, ATTRIBUTE.getRaw(host, name));
      }
      observer.observe(host, { attributes: true });
    },
    disconnected() {
      observer.disconnect();
    },
  });
}
