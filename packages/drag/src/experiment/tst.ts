const ADMIT_POINTER = 1;
const OPERATION_ARMED = 2;

type DraggableEvent = typeof ADMIT_POINTER | typeof OPERATION_ARMED;

// Deliberately mutable
type RuntimeContext = {};

export type Dispatch = (
  event: DraggableEvent,
  ctx: RuntimeContext,
) => Promise<void> | void;
