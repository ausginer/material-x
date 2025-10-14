export interface ReactiveController {
  attrChanged?(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void;
  connected?(): void;
  disconnected?(): void;
}
