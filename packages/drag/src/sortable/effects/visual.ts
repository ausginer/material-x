import { createMapper } from '../../kernel/coordinate.ts';
import {
  acquireLift,
  createDragRenderer,
  LIFT_FAITHFUL,
  type DragRenderer,
  type VisualLiftSession,
} from '../../kernel/presentation.ts';
import type { DOMRealm } from '../../kernel/realm.ts';
import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../../kernel/session.ts';
import {
  MOTION_PRESENTATION_FAILED,
  type PresentMotionEffect,
  type SortableEvent,
  type SortableOperation,
} from '../machine.ts';
import type { OperationInputOwner } from './operation.ts';

export type SortableVisualOwner = Readonly<{
  acquire(operation: SortableOperation): void;
  present(effect: PresentMotionEffect): EffectDisposition;
  originRect(): DOMRectReadOnly;
  lift(): VisualLiftSession;
  connected(): boolean;
  release(): void;
  destroy(): void;
}>;

export function createSortableVisualOwner(
  realm: DOMRealm,
  operation: OperationInputOwner,
  dispatch: (event: SortableEvent) => void,
): SortableVisualOwner {
  let lift: VisualLiftSession | null = null;
  let renderer: DragRenderer | null = null;
  let origin = new realm.window.DOMRectReadOnly();

  const release = (): void => {
    renderer = null;
    lift?.dispose();
    lift = null;
  };

  return {
    acquire(operation) {
      release();
      origin = operation.visual.getBoundingClientRect();
      const context = operation.item.offsetParent;
      const mapper = createMapper(
        context instanceof realm.window.HTMLElement
          ? context
          : realm.document.documentElement,
        realm,
      );
      const acquired = acquireLift(
        operation.visual,
        LIFT_FAITHFUL,
        origin,
        (delta) => mapper.deltaFromViewport(delta),
        realm,
      );
      try {
        const acquiredRenderer = createDragRenderer(acquired);
        lift = acquired;
        renderer = acquiredRenderer;
      } catch (error) {
        acquired.dispose();
        throw error;
      }
    },
    present(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }
      try {
        if (!renderer) {
          throw new Error('drag: sortable renderer is unavailable');
        }
        renderer.render({
          x: effect.point.x - effect.origin.x,
          y: effect.point.y - effect.origin.y,
        });
        return CONTINUE_BATCH;
      } catch (error) {
        dispatch({
          type: MOTION_PRESENTATION_FAILED,
          operationId: effect.operationId,
          motionId: effect.motionId,
          error,
        });
        return STOP_BATCH;
      }
    },
    originRect: () => origin,
    lift() {
      if (!lift) {
        throw new Error('drag: sortable lift is unavailable');
      }
      return lift;
    },
    connected: () => lift?.visual.isConnected ?? false,
    release,
    destroy: release,
  };
}
