import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../../kernel/session.ts';
import { anchorIndex } from '../geometry.ts';
import { currentInsertion } from '../insertion.ts';
import {
  PLACEHOLDER_WRITE_FAILED,
  type PlaceCommittedInsertionEffect,
  type SortableEffectDeps,
  type SortableEvent,
  type SortableOperation,
} from '../machine.ts';
import {
  createAnchor,
  insertPlaceholder,
  type PlaceholderLease,
} from '../placeholder.ts';
import type { OperationInputOwner } from './operation.ts';
import type { SortableVisualOwner } from './visual.ts';

export type SortablePlaceholderOwner = Readonly<{
  acquire(
    operation: SortableOperation,
    visual: SortableVisualOwner,
  ): ActivationResult;
  element(): HTMLElement;
  rect(): DOMRectReadOnly;
  place(effect: PlaceCommittedInsertionEffect): EffectDisposition;
  returnHome(): void;
  release(): void;
  destroy(): void;
}>;

export type ActivationResult = Readonly<{
  activationVersion: number;
  activationIndex: number;
  insertion: NonNullable<SortableOperation['insertion']>;
}>;

export function createSortablePlaceholderOwner(
  deps: SortableEffectDeps,
  dirty: () => void,
  operation: OperationInputOwner,
  dispatch: (event: SortableEvent) => void,
): SortablePlaceholderOwner {
  let lease: PlaceholderLease | null = null;

  const required = (): PlaceholderLease => {
    if (!lease) {
      throw new Error('drag: sortable placeholder is unavailable');
    }
    return lease;
  };
  const release = (): void => {
    lease?.dispose();
    lease = null;
  };

  return {
    acquire(operation, visual) {
      release();
      const anchor = createAnchor(
        { createPlaceholder: deps.createPlaceholder },
        deps.realm,
        operation.item,
        operation.visual,
        visual.originRect(),
      );
      try {
        lease = insertPlaceholder(anchor, operation.item);
      } catch (error) {
        anchor.remove();
        throw error;
      }
      try {
        const insertion = currentInsertion(
          lease,
          operation.snapshot.items,
          operation.item,
          operation.snapshot.version,
        );
        return {
          activationVersion: operation.snapshot.version,
          activationIndex: anchorIndex(
            operation.snapshot.items,
            operation.item,
            lease.element,
          ),
          insertion,
        };
      } catch (error) {
        release();
        throw error;
      }
    },
    element: () => required().element,
    rect: () => required().rect(),
    place(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }
      try {
        const placeholder = required();
        const reference = effect.insertion.after;
        const unchanged =
          reference === placeholder.element ||
          placeholder.element.nextSibling === reference;
        if (!unchanged) {
          placeholder.placeBefore(reference);
          dirty();
        }
        return CONTINUE_BATCH;
      } catch (error) {
        dispatch({
          type: PLACEHOLDER_WRITE_FAILED,
          operationId: effect.operationId,
          error,
        });
        return STOP_BATCH;
      }
    },
    returnHome() {
      const placeholder = required();
      const before = placeholder.element.nextSibling;
      placeholder.returnHome();
      if (placeholder.element.nextSibling !== before) {
        dirty();
      }
    },
    release,
    destroy: release,
  };
}
