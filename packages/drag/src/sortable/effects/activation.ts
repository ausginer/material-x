import { createMapper } from '../../kernel/coordinate.ts';
import type { OperationResources } from '../../kernel/operation-resources.ts';
import { acquirePointerCapture } from '../../kernel/pointer.ts';
import {
  acquireLift,
  createDragRenderer,
  LIFT_FAITHFUL,
  type DragRenderer,
  type VisualLiftSession,
} from '../../kernel/presentation.ts';
import { anchorIndex } from '../geometry.ts';
import { currentInsertion, resolveSpatialInsertion } from '../insertion.ts';
import {
  INPUT_POINTER,
  type SortableEffectDeps,
  type SpatialRequest,
  type SortableOperation,
} from '../machine.ts';
import {
  createAnchor,
  insertPlaceholder,
  type PlaceholderLease,
} from '../placeholder.ts';
import {
  createRectIndex,
  markRectIndexDirty,
  type RectIndex,
} from '../rect-index.ts';

export type ActivationResult = Readonly<{
  activationVersion: number;
  activationIndex: number;
  insertion: NonNullable<SortableOperation['insertion']>;
}>;

export type SortablePresentationOwner = Readonly<{
  acquire(
    operation: SortableOperation,
    resources: OperationResources,
  ): ActivationResult;
  render(
    origin: Readonly<{ x: number; y: number }>,
    point: Readonly<{ x: number; y: number }>,
  ): void;
  resolve(request: SpatialRequest): NonNullable<SortableOperation['insertion']>;
  place(insertion: NonNullable<SortableOperation['insertion']>): void;
  returnHome(): void;
  placeholderRect(): DOMRectReadOnly;
  originRect(): DOMRectReadOnly;
  lift(): VisualLiftSession | null;
  visualConnected(): boolean;
  invalidate(): void;
  destroy(): void;
}>;

export function createSortablePresentationOwner(
  deps: SortableEffectDeps,
): SortablePresentationOwner {
  let lift: VisualLiftSession | null = null;
  let renderer: DragRenderer | null = null;
  let placeholder: PlaceholderLease | null = null;
  let origin = new deps.realm.window.DOMRectReadOnly();
  const index: RectIndex = createRectIndex();

  return {
    acquire(operation, resources) {
      origin = operation.visual.getBoundingClientRect();
      const context = operation.item.offsetParent;
      const mapper = createMapper(
        context instanceof deps.realm.window.HTMLElement
          ? context
          : deps.realm.document.documentElement,
        deps.realm,
      );
      lift = acquireLift(
        operation.visual,
        LIFT_FAITHFUL,
        origin,
        (delta) => mapper.deltaFromViewport(delta),
        deps.realm,
      );
      renderer = createDragRenderer(lift);
      const anchor = createAnchor(
        { createPlaceholder: deps.createPlaceholder },
        deps.realm,
        operation.item,
        operation.visual,
        origin,
      );
      placeholder = insertPlaceholder(anchor, operation.item);
      const ownedPlaceholder = placeholder;
      const ownedLift = lift;
      resources.presentation.use(() => ownedPlaceholder.dispose());
      resources.presentation.use(() => ownedLift.dispose());

      if (operation.input.type === INPUT_POINTER) {
        resources.interaction.use(
          acquirePointerCapture(operation.item, operation.input.pointerId),
        );
      }

      deps.invalidation.arm(resources.signal, () => {
        markRectIndexDirty(index);
      });
      const insertion = currentInsertion(
        placeholder,
        operation.snapshot.items,
        operation.item,
        operation.snapshot.version,
      );
      return {
        activationVersion: operation.snapshot.version,
        activationIndex: anchorIndex(
          operation.snapshot.items,
          operation.item,
          placeholder.element,
        ),
        insertion,
      };
    },
    render(originPoint, point) {
      renderer?.render({
        x: point.x - originPoint.x,
        y: point.y - originPoint.y,
      });
    },
    resolve(request) {
      if (request.keyboard && request.incumbent) {
        return request.incumbent;
      }
      if (!placeholder) {
        throw new Error('drag: sortable placeholder is unavailable');
      }
      markRectIndexDirty(index);
      return (
        resolveSpatialInsertion(
          index,
          placeholder,
          request.snapshot.items,
          request.item,
          deps.getVisual,
          request.point,
          request.snapshot.version,
        ) ??
        request.incumbent ??
        currentInsertion(
          placeholder,
          request.snapshot.items,
          request.item,
          request.snapshot.version,
        )
      );
    },
    place(insertion) {
      placeholder?.placeBefore(insertion.after);
      markRectIndexDirty(index);
    },
    returnHome() {
      placeholder?.returnHome();
    },
    placeholderRect() {
      if (!placeholder) {
        throw new Error('drag: sortable placeholder is unavailable');
      }
      return placeholder.rect();
    },
    originRect: () => origin,
    lift: () => lift,
    visualConnected: () => lift?.visual.isConnected ?? false,
    invalidate() {
      markRectIndexDirty(index);
    },
    destroy() {
      placeholder = null;
      renderer = null;
      lift = null;
    },
  };
}
