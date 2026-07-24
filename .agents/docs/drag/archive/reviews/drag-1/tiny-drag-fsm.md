# Event Processing and State Transitions

## 1. Event-driven session model

Each drag session should be represented as an explicit finite-state machine.

The current session state is stored as an ordinary value:

```ts
let state: DragSessionState = {
  type: 'idle',
};
```

All relevant input is processed through one transition function:

```ts
state = transition(state, event);
```

The transition function should be the single authority that determines whether an event is meaningful in the current state and which state follows from it.

---

## 2. Session states

The top-level session states should represent distinct interaction phases:

```ts
type DragSessionState =
  | {
      type: 'idle';
    }
  | {
      type: 'pending';
      pointerId: number;
      origin: Point;
      latest: Point;
    }
  | {
      type: 'dragging';
      pointerId: number;
      origin: Point;
      latest: Point;
    }
  | {
      type: 'awaiting-commit';
      destination: DropDestination;
    }
  | {
      type: 'settling';
      result: 'accepted' | 'rejected' | 'canceled';
    };
```

The state union should encode which data is available in each phase.

For example:

- `pointerId` exists while a pointer owns the session;
- `origin` exists after a valid pointer press;
- `destination` exists after a drop proposal;
- `result` exists once the final outcome is known.

State-specific data should be stored in the corresponding union member instead of optional shared fields.

---

## 3. Native DOM events as transition input

Native `PointerEvent` objects should be accepted directly as state-machine input.

The browser-provided `event.type` acts as the event discriminator:

```ts
function transition(
  state: DragSessionState,
  event: DragSessionEvent,
): DragSessionState {
  switch (state.type) {
    case 'idle':
      return transitionIdle(state, event);

    case 'pending':
      return transitionPending(state, event);

    case 'dragging':
      return transitionDragging(state, event);

    case 'awaiting-commit':
      return transitionAwaitingCommit(state, event);

    case 'settling':
      return transitionSettling(state, event);
  }
}
```

Pointer events can enter the machine without being wrapped in equivalent custom objects:

```ts
type DragSessionEvent =
  | PointerEvent
  | { type: 'escape' }
  | { type: 'commit-observed' }
  | { type: 'drop-accepted' }
  | { type: 'drop-rejected' }
  | { type: 'animation-finished' }
  | { type: 'destroy' };
```

Custom events should be introduced only for lifecycle signals that do not already exist as DOM events.

---

## 4. Shared pointer event listener

All relevant pointer event types should be able to use the same listener:

```ts
const handlePointerEvent = (event: PointerEvent): void => {
  transit(event);
};

for (const type of [
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'lostpointercapture',
] as const) {
  target.addEventListener(type, handlePointerEvent, {
    signal: controller.signal,
  });
}
```

The listener should not contain state-specific drag logic.

Its responsibility is to forward browser input into the session transition mechanism.

---

## 5. Transition boundary

State updates and transition effects should pass through one boundary:

```ts
function transit(event: DragSessionEvent): void {
  const previous = state;
  const next = transition(previous, event);

  state = next;

  applyTransitionEffects(previous, next, event);
}
```

The session state should be assigned before transition effects run.

This ordering ensures that synchronous DOM events caused by an effect observe the new state.

For example:

```text
pointerup
→ transition to settling
→ releasePointerCapture()
→ lostpointercapture is emitted
→ lostpointercapture observes settling
```

This prevents browser-generated follow-up events from repeating drop, rollback, or cleanup logic.

---

## 6. Pure state transitions

The core transition function should be deterministic and free of DOM effects.

Given the same state and event, it should return the same next state:

```ts
const next = transition(current, event);
```

The transition function may:

- inspect the current state;
- inspect event data;
- validate pointer ownership;
- evaluate activation thresholds;
- select the next state;
- update state-local context.

DOM operations should run outside the reducer-like transition function.

These include:

- setting or releasing pointer capture;
- creating the placeholder;
- promoting the visual;
- updating transforms;
- starting animations;
- calling consumer callbacks;
- removing temporary nodes.

This separation allows the transition graph to be tested independently from browser effects.

---

## 7. Transition effects

Effects should be derived from the combination of:

- previous state;
- next state;
- triggering event.

Example:

```ts
function applyTransitionEffects(
  previous: DragSessionState,
  next: DragSessionState,
  event: DragSessionEvent,
): void {
  if (previous.type === 'idle' && next.type === 'pending') {
    beginPointerTracking(next.pointerId);
  }

  if (previous.type === 'pending' && next.type === 'dragging') {
    activateVisual();
  }

  if (
    previous.type === 'dragging' &&
    next.type === 'dragging' &&
    event.type === 'pointermove'
  ) {
    updateVisual(event);
  }

  if (previous.type === 'dragging' && next.type === 'awaiting-commit') {
    proposeDrop(next.destination);
  }

  if (next.type === 'settling' && previous.type !== 'settling') {
    beginSettling(next.result);
  }

  if (previous.type === 'settling' && next.type === 'idle') {
    completeCleanup();
  }
}
```

Effects should run once for each meaningful transition.

Repeated browser events that leave the machine in the same state should not accidentally repeat entry effects.

---

## 8. Pointer ownership

States associated with an active pointer should store its `pointerId`.

Pointer events should affect the session only when they belong to the owning pointer:

```ts
function belongsToSession(
  state: Extract<DragSessionState, { type: 'pending' | 'dragging' }>,
  event: PointerEvent,
): boolean {
  return event.pointerId === state.pointerId;
}
```

Pointer ownership validation should happen inside the transition layer so that every pointer event follows the same rule.

---

## 9. State-local event interpretation

The meaning of a browser event depends on the current session state.

For example:

```text
idle + pointerdown
→ pending

pending + pointermove below threshold
→ pending

pending + pointermove beyond threshold
→ dragging

pending + pointerup
→ idle

dragging + pointermove
→ dragging

dragging + pointerup
→ awaiting-commit or settling

dragging + pointercancel
→ settling(canceled)

settling + lostpointercapture
→ settling
```

The transition function should interpret events according to the current state instead of using global event handlers with independent boolean guards.

---

## 10. Unsupported events

An event that does not define a transition from the current state should leave the state unchanged:

```ts
return state;
```

This behavior should be deterministic and safe.

Examples include:

- `pointermove` while idle;
- events from another pointer;
- duplicate `pointerup`;
- `lostpointercapture` after the session has already entered settling;
- pointer input while awaiting an external commit.

Development builds may optionally report unexpected transitions for diagnostics.

---

## 11. Re-entrancy

Effects may synchronously cause additional browser events or consumer callbacks.

The session should therefore support re-entrant calls to `transit()`.

The following invariant should always hold:

> Before any transition effect executes, the session already exposes the next state.

If a consumer callback destroys the controller, disconnects the item, changes the collection, or triggers another relevant event, the nested transition should start from the current state rather than the previous one.

---

## 12. Animation and commit signals

Animation completion and external renderer commits should enter the same transition mechanism as pointer events:

```ts
animation.finished.then(
  () => transit({ type: 'animation-finished' }),
  () => transit({ type: 'animation-canceled' }),
);

function updateItems(items: readonly HTMLElement[]): void {
  if (matchesExpectedCommit(items)) {
    transit({ type: 'commit-observed' });
  }
}
```

Asynchronous lifecycle signals should not mutate session state directly.

This keeps pointer input, animation completion, consumer decisions, cancellation, and DOM commit observation within one transition model.

---

## 13. State machine testability

The transition function should be testable as a pure sequence of values:

```ts
let state: DragSessionState = {
  type: 'idle',
};

state = transition(state, pointerDown);
state = transition(state, pointerMoveBelowThreshold);
state = transition(state, pointerMoveAboveThreshold);
state = transition(state, pointerUp);
state = transition(state, commitObserved);
state = transition(state, animationFinished);
```

Tests should verify:

- the resulting state after each event;
- ignored events;
- foreign pointer handling;
- normal completion sequences;
- cancellation sequences;
- duplicate browser events;
- `pointercancel` followed by `lostpointercapture`;
- `pointerup` followed by an explicit capture release;
- re-entrant destruction or cancellation.

DOM-effect tests should be separate from transition-table tests.