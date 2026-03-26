export interface ElementController {
  attrChanged?(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void | Promise<void>;
  connected?(): void | Promise<void>;
  disconnected?(): void | Promise<void>;
}
