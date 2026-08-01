/** Realm-neutral event names. Pointer events are discriminated by name rather
 * than `instanceof PointerEvent`, so a cross-realm event still matches. */
export const POINTER_DOWN = 'pointerdown';
export const POINTER_MOVE = 'pointermove';
export const POINTER_UP = 'pointerup';
export const POINTER_CANCEL = 'pointercancel';
export const LOST_POINTER_CAPTURE = 'lostpointercapture';
export const KEY_DOWN = 'keydown';
export const KEY_ESCAPE = 'Escape';
