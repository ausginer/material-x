export interface ReactiveController {
  connected?(): void;
  disconnected?(): void;
}
