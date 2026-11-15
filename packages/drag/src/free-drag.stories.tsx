import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState, type JSX } from 'react';
import { bounds } from './free-drag/bounds.ts';
import { landing } from './free-drag/landing.ts';
import {
  freeDrag,
  FreeDragResolution,
  type DragAxis,
  type FreeDragResult,
} from './free-drag.ts';
import css from './stories.module.css';

const meta: Meta = {
  title: 'Drag/Free Drag',
};

export default meta;

type Offset = { x: number; y: number };

/**
 * Commits an accepted drop: the lift owns `translate` until release, so the new
 * position is written once `onEnd` runs. The offset outlives the controller, so a
 * box keeps its place when a control rebuilds the controller.
 */
function commitDrop(
  box: HTMLElement,
  offset: Offset,
  result: FreeDragResult,
): void {
  if (result.type === 'accepted') {
    offset.x += result.request.localDeltaX;
    offset.y += result.request.localDeltaY;
    box.style.translate = `${offset.x}px ${offset.y}px`;
  }
}

type InteractiveArgs = Readonly<{
  axis: DragAxis;
  bounded: boolean;
  tilted: boolean;
}>;

/**
 * With `bounded` on, the dashed area is the bounds. With it off, `bounds()` keeps
 * the box inside the viewport. The box's own `transform` composes with the
 * `translate` the drop commits.
 */
function InteractiveDemo({
  axis,
  bounded,
  tilted,
}: InteractiveArgs): JSX.Element {
  const areaRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const offset = useRef<Offset>({ x: 0, y: 0 });

  useEffect(() => {
    const box = boxRef.current!;
    const controller = freeDrag(box, {
      axis,
      bounds: bounded ? bounds(areaRef.current!) : bounds(),
      landing: landing(),
      onDrop: () => FreeDragResolution.accept(),
      onEnd: (result) => {
        commitDrop(box, offset.current, result);
      },
    });

    return () => {
      void controller.requestDestroy();
    };
  }, [axis, bounded]);

  return (
    <div className={css['stage']}>
      <p className={css['hint']}>
        Drag the box{bounded ? '. It stays inside the dashed area' : ''}. Escape
        sends it home with a landing.
      </p>
      <div ref={areaRef} className={css['area']}>
        <div
          ref={boxRef}
          className={tilted ? `${css['box']} ${css['tilted']}` : css['box']}
        >
          Drag me
        </div>
      </div>
    </div>
  );
}

export const Interactive: StoryObj<InteractiveArgs> = {
  args: {
    axis: 'both',
    bounded: true,
    tilted: false,
  },
  argTypes: {
    axis: {
      control: 'inline-radio',
      options: ['both', 'x', 'y'],
    },
    bounded: {
      control: 'boolean',
    },
    tilted: {
      control: 'boolean',
      description: 'Give the box its own transform, composed with the drag.',
    },
  },
  render: (args) => <InteractiveDemo {...args} />,
};

/** The drop is confirmed after an asynchronous save, and the lift holds until then. */
function AsyncDropDemo(): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    const box = boxRef.current!;
    const offset: Offset = { x: 0, y: 0 };
    const controller = freeDrag(box, {
      onStart: () => {
        setStatus('dragging…');
      },
      async onDrop() {
        setStatus('saving…');
        await new Promise((resolve) => {
          setTimeout(resolve, 600);
        });
        return FreeDragResolution.accept();
      },
      onEnd: (result) => {
        commitDrop(box, offset, result);
        setStatus(result.type);
      },
    });

    return () => {
      void controller.requestDestroy();
    };
  }, []);

  return (
    <div className={css['stage']}>
      <p className={css['hint']}>
        Drop the box. The drop is confirmed after a short asynchronous save:{' '}
        <output data-status>{status}</output>.
      </p>
      <div className={css['area']}>
        <div ref={boxRef} className={css['box']}>
          Drop me
        </div>
      </div>
    </div>
  );
}

export const AsyncDropConfirmation: StoryObj = {
  render: () => <AsyncDropDemo />,
};

/**
 * The lifted box keeps the stage's rotation and scale. The local delta is the
 * pointer's travel in the stage's own space, which is what the drop commits.
 */
function TransformedStageDemo(): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  const [local, setLocal] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const box = boxRef.current!;
    const offset: Offset = { x: 0, y: 0 };
    const controller = freeDrag(box, {
      onDrop: () => FreeDragResolution.accept(),
      onMove: (geometry) => {
        setLocal({
          x: Math.round(geometry.localDeltaX),
          y: Math.round(geometry.localDeltaY),
        });
      },
      onEnd: (result) => {
        commitDrop(box, offset, result);
      },
    });

    return () => {
      void controller.requestDestroy();
    };
  }, []);

  return (
    <div className={css['stage']}>
      <p className={css['hint']}>
        A rotated, scaled stage. The lifted box keeps its transform. Local
        delta: ({local.x}, {local.y}).
      </p>
      <div className={`${css['area']} ${css['warped']}`}>
        <div ref={boxRef} className={css['box']}>
          Drag me
        </div>
      </div>
    </div>
  );
}

export const TransformedStage: StoryObj = {
  render: () => <TransformedStageDemo />,
};
