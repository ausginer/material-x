// The owner's file imports `../element.ts` from `traits/`. Here that is core's
// real ControlledElement, not the probes' stand-in: the real one declares no
// static observedAttributes, as the owner's comment in IconButton says.
export { ControlledElement } from '../../../../../packages/core/src/element.ts';
