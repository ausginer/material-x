/**
 * The one class the library reports. `reportError` gives every global `error`
 * listener a typed way to recognise a drag fault, and `cause` is the thrown
 * value by identity, whatever that value is.
 */
function describe(cause: unknown): string {
  // Reading a message is foreign code: a hostile object may throw from a getter
  // or from its string conversion, and the report must still go out.
  try {
    return String((cause as Error | null | undefined)?.message ?? cause);
  } catch {
    return 'unreadable value';
  }
}

export class DragFault extends Error {
  override readonly name: string = 'DragFault';

  constructor(cause: unknown) {
    super(`drag: ${describe(cause)}`, { cause });
  }
}
