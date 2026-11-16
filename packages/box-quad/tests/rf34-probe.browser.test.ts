// Scratch probe for repo:RF-34, removed after its reading. It reads the row's
// fixture's client rects and reports whether each edge is a multiple of 1/60 px.
import { describe, expect, it } from 'vitest';
import { server } from 'vitest/browser';
import { createBox, measure } from './support/fixtures.ts';

const BOX_WIDTH = 6;
const BOX_HEIGHT = 7;

// An edge is quantized at q, reported at r, when it equals a multiple of q
// rounded to a multiple of r.
function quantizedAt(value: number, q: number, r: number): boolean {
  return Math.round((Math.round(value / q) * q) / r) * r === value;
}

const QUANTA = [
  ['1/60', 1 / 60],
  ['1/64', 1 / 64],
] as const;
const RESOLUTIONS = [
  ['2^-14', 2 ** -14],
  ['2^-16', 2 ** -16],
  ['exact', 0],
] as const;

function classify(value: number): string {
  if (Number.isInteger(value)) {
    return 'integer';
  }
  for (const [qName, q] of QUANTA) {
    for (const [rName, r] of RESOLUTIONS) {
      if (
        r === 0
          ? Math.abs(value - Math.round(value / q) * q) <= 1e-9
          : quantizedAt(value, q, r)
      ) {
        return `q=${qName} r=${rName}`;
      }
    }
  }
  return 'no q';
}

function edges(rect: DOMRect): string {
  return (['left', 'top', 'right', 'bottom', 'width', 'height'] as const)
    .map((key) => `${key}=${rect[key]} (${classify(rect[key])})`)
    .join(' ');
}

describe('RF-34 probe', () => {
  it('should read the rotated and scaled fixture', () => {
    const box = createBox({
      styles: {
        width: '20px',
        height: '10px',
        transform: 'rotate(30deg) scale(1.5)',
      },
    });
    const clientRects = box.getClientRects();
    const bounding = box.getBoundingClientRect();
    const measured = measure(box);
    // oxlint-disable-next-line no-console
    console.log(
      `RF34 ${server.browser} clientRects=${clientRects.length} [0] ${edges(clientRects[0]!)}\n` +
        `RF34 ${server.browser} bounding ${edges(bounding)}\n` +
        `RF34 ${server.browser} recovered width=${measured[BOX_WIDTH]} (error ${measured[BOX_WIDTH]! - 20}) height=${measured[BOX_HEIGHT]} (error ${measured[BOX_HEIGHT]! - 10})`,
    );
    expect(clientRects.length).toBe(1);
  });
});
