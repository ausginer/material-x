// Scratch probe for repo:RF-34, removed after its reading. It reads the row's
// fixture's client rects and reports whether each edge is a multiple of 1/60 px.
import { describe, expect, it } from 'vitest';
import { server } from 'vitest/browser';
import { createBox, measure } from './support/fixtures.ts';

const BOX_WIDTH = 6;
const BOX_HEIGHT = 7;

function onSixtieth(value: number): boolean {
  return Math.abs(value - Math.round(value * 60) / 60) <= 1e-9;
}

function edges(rect: DOMRect): string {
  return (['left', 'top', 'right', 'bottom', 'width', 'height'] as const)
    .map(
      (key) =>
        `${key}=${rect[key]} (${onSixtieth(rect[key]) ? '1/60' : 'not 1/60'})`,
    )
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
