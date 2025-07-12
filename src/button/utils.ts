export const AriaMapping = {
  checked(internals: ElementInternals, value: string | null): void {
    internals.ariaChecked = value != null ? 'true' : 'false';
  },
  disabled(internals: ElementInternals, value: string | null): void {
    internals.ariaDisabled = value != null ? 'true' : 'false';
  },
} as const;
export type AriaMapping = typeof AriaMapping;

export function makeTabbable(element: HTMLElement): void {
  element.tabIndex = 0;
}
