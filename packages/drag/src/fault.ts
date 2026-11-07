/**
 * Reading a message is foreign code: a hostile object may throw from a getter or
 * from its string conversion, and the report must still go out.
 */
function readMessage(cause: unknown): string {
  try {
    return String((cause as Error | null | undefined)?.message ?? cause);
  } catch {
    return 'unreadable value';
  }
}

/**
 * The one class this library reports, through the library realm's `reportError`.
 * A global `error` listener can recognize it by type, and `cause` is the thrown
 * value by identity, whatever that value is.
 */
export class DragFault extends Error {
  override readonly name: string = 'DragFault';

  constructor(cause: unknown) {
    super(`drag: ${readMessage(cause)}`, { cause });
  }
}
