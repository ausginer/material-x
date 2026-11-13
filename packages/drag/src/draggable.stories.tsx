import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  coordinates,
  localDelta,
  type Box,
  type Delta,
} from '@ydinjs/box-quad';
import { useEffect, useRef, type JSX } from 'react';
import { draggable } from './draggable.ts';
import css from './stories.module.css';

const meta: Meta = {
  title: 'Drag/Custom Behavior',
};

export default meta;

type State = Readonly<{ width: number; height: number; basis: Box }>;

/**
 * A behavior with no lift: a resize handle. The size is in the target's own box, so
 * the viewport delta converts through that box, and this stays correct in a
 * transformed parent. Escape restores the size.
 */
function ResizeDemo(): JSX.Element {
  const targetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current!;
    const handle = handleRef.current!;
    const local: Delta = [];
    const write = (width: number, height: number): void => {
      target.style.width = `${width}px`;
      target.style.height = `${height}px`;
    };
    const controller = draggable<State>(handle, {
      threshold: 1,
      admit: () => ({
        item: handle,
        state: {
          width: target.offsetWidth,
          height: target.offsetHeight,
          basis: [],
        },
      }),
      activate(drag, state) {
        if (!coordinates(target, state.basis)) {
          throw new Error('resize/no-basis');
        }

        return {
          move() {
            const { x, y, originX, originY } = drag;

            if (localDelta(state.basis, x - originX, y - originY, local)) {
              write(state.width + local[0]!, state.height + local[1]!);
            }
          },
          end(outcome) {
            if (outcome.type === 'canceled') {
              write(state.width, state.height);
            }
          },
        };
      },
    });

    return () => {
      void controller.requestDestroy();
    };
  }, []);

  return (
    <div className={css['stage']} style={{ rotate: '6deg', scale: '0.9' }}>
      <p className={css['hint']}>
        Drag the corner inside this rotated, scaled parent. Escape restores.
      </p>
      <div ref={targetRef} className={css['resizable']}>
        <div ref={handleRef} className={css['grip']} />
      </div>
    </div>
  );
}

export const ResizeHandle: StoryObj = {
  render: () => <ResizeDemo />,
};
