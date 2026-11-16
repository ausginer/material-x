/*
 * Appended to `tests/support/browser-setup.ts` for one visual run and removed
 * after it. Before each fixture is torn down, it asks Chromium over CDP which
 * platform fonts rendered the text under every element, shadow roots included
 * (`CSS.getPlatformFontsForNode`), and writes the set, with each element's name
 * and its own text, to `platform-fonts.<file>.json`.
 */
import {
  afterAll as probeAfterAll,
  afterEach as probeAfterEach,
  expect as probeExpect,
} from 'vitest';
import { cdp as probeCdp, commands as probeCommands } from 'vitest/browser';

type ProbeNode = {
  nodeId: number;
  nodeType: number;
  nodeName: string;
  nodeValue: string;
  children?: ProbeNode[];
  shadowRoots?: ProbeNode[];
  contentDocument?: ProbeNode;
};

const probeFonts = new Set<string>();
let probeFile = 'unknown';

function probeWalk(node: ProbeNode, visit: (node: ProbeNode) => void): void {
  visit(node);

  // The test runs in an iframe of the page that the session is attached to.
  for (const child of [
    ...(node.contentDocument ? [node.contentDocument] : []),
    ...(node.shadowRoots ?? []),
    ...(node.children ?? []),
  ]) {
    probeWalk(child, visit);
  }
}

probeAfterEach(async () => {
  probeFile = probeExpect.getState().testPath?.split('/').pop() ?? probeFile;

  const session = probeCdp();

  await session.send('DOM.enable');
  await session.send('CSS.enable');

  const { root } = (await session.send('DOM.getDocument', {
    depth: -1,
    pierce: true,
  })) as { root: ProbeNode };
  const elements: ProbeNode[] = [];

  // Every element: slotted text is reported under the host, the slot, or
  // neither, depending on the layout object that holds it.
  probeWalk(root, (node) => {
    if (node.nodeType === 1) {
      elements.push(node);
    }
  });

  for (const element of elements) {
    const text = (element.children ?? [])
      .filter((child) => child.nodeType === 3)
      .map((child) => child.nodeValue.trim())
      .join('');
    const { fonts } = (await session.send('CSS.getPlatformFontsForNode', {
      nodeId: element.nodeId,
    })) as {
      fonts: {
        familyName: string;
        postScriptName: string;
        isCustomFont: boolean;
        glyphCount: number;
      }[];
    };

    for (const font of fonts.filter(
      () => element.nodeName !== 'HTML' && element.nodeName !== 'BODY',
    )) {
      probeFonts.add(
        `${element.nodeName} ${JSON.stringify(text.slice(0, 12))}: ${font.familyName} (${font.postScriptName}, custom: ${font.isCustomFont})`,
      );
    }
  }
});

probeAfterAll(async () => {
  await probeCommands.writeFile(
    `platform-fonts.${probeFile}.json`,
    JSON.stringify([...probeFonts].sort(), null, 2),
  );
});
