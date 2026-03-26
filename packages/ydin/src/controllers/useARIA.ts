import { attr } from '../attribute.ts';
import type { ControlledElement } from '../element.ts';
import { useConnected } from './useConnected.ts';
import { useMutationObserver } from './useMutationObserver.ts';

export type ARIATransferTransformer = (
  name: string,
  value: string | null,
) => string | null;

export function useARIATransfer(
  host: ControlledElement,
  target: HTMLElement,
  transform: ARIATransferTransformer = (_, value) => value,
): void {
  useConnected(host, () => {
    for (const { name } of host.attributes) {
      if (name.startsWith('aria-')) {
        attr.setRaw(target, name, transform(name, attr.getRaw(host, name)));
      }
    }
  });

  useMutationObserver(
    host,
    (records) => {
      for (const { type, attributeName: name } of records) {
        if (type === 'attributes' && name?.startsWith('aria-')) {
          attr.setRaw(target, name, transform(name, attr.getRaw(host, name)));
        }
      }
    },
    { attributes: true },
  );
}
