/**
 * The smallest free drag: `freeDrag` with a synchronous verdict.
 *
 * The drop is the consumer's to commit. Without the write below the box returns
 * to its place in flow when the lift is released.
 */
import { FreeDragResolution, freeDrag } from '../../src/free-drag.ts';

const box = document.querySelector<HTMLElement>('#box')!;
let x = 0;
let y = 0;

freeDrag(box, {
  onDrop({ localDeltaX, localDeltaY }) {
    x += localDeltaX;
    y += localDeltaY;
    box.style.translate = `${x}px ${y}px`;
    return FreeDragResolution.accept();
  },
});
