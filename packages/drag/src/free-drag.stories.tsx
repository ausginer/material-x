import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, type JSX } from 'react';
import { bounds } from './free-drag/bounds.ts';
import { landing } from './free-drag/landing.ts';
import { freeDrag, FreeDragResolution } from './free-drag.ts';
import css from './stories.module.css';

const meta: Meta = {
  title: 'Drag/Free Drag',
};

export default meta;

function FreeDragDemo(): JSX.Element {
  const areaRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current!;
    let x = 0;
    let y = 0;
    const controller = freeDrag(box, {
      bounds: bounds(areaRef.current!),
      landing: landing(),
      onDrop({ localDeltaX, localDeltaY }) {
        x += localDeltaX;
        y += localDeltaY;
        box.style.translate = `${x}px ${y}px`;
        return FreeDragResolution.accept();
      },
    });

    return () => {
      void controller.requestDestroy();
    };
  }, []);

  return (
    <div className={css['stage']}>
      <p className={css['hint']}>
        The box stays inside the area. Escape sends it home with a landing.
      </p>
      <div ref={areaRef} className={css['area']}>
        <div ref={boxRef} className={css['box']}>
          Drag me
        </div>
      </div>
    </div>
  );
}

export const Bounded: StoryObj = {
  render: () => <FreeDragDemo />,
};
