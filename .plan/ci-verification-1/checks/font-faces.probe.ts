/*
 * Appended to `tests/support/browser-setup.ts` for one visual run and removed
 * after it. Before each fixture is torn down, it collects the computed family,
 * weight and style that each non-empty text node renders with, inside shadow
 * roots too, and writes the set to `font-faces.<file>.json`.
 */
import {
  afterAll as probeAfterAll,
  afterEach as probeAfterEach,
  expect as probeExpect,
} from 'vitest';
import { commands as probeCommands } from 'vitest/browser';

const probeFaces = new Set<string>();
let probeFile = 'unknown';

function probeCollect(root: Document | ShadowRoot): void {
  for (const element of root.querySelectorAll('*')) {
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        // A slotted text node renders with its slot's style.
        const parent = (node as Text).assignedSlot ?? element;
        const style = getComputedStyle(parent);

        probeFaces.add(
          `${style.fontFamily} | ${style.fontWeight} | ${style.fontStyle} | <${parent.localName}>`,
        );
      }
    }

    if (element.shadowRoot) {
      probeCollect(element.shadowRoot);
    }
  }
}

probeAfterEach(() => {
  probeFile = probeExpect.getState().testPath?.split('/').pop() ?? probeFile;
  probeCollect(document);
});

probeAfterAll(async () => {
  await probeCommands.writeFile(
    `font-faces.${probeFile}.json`,
    JSON.stringify([...probeFaces].sort(), null, 2),
  );
});
