/**
 * Chromium's own accessibility tree, read through CDP. Node side;
 * `tests/support/browser-commands.ts` declares the command for the browser.
 *
 * The tree is the browser's, not one computed in page script, so it shows
 * what Chromium exposes for shadow trees, slots and `display: contents`.
 * Playwright opens a CDP session only in Chromium, so the command fails in
 * Firefox and WebKit, and it throws for a provider other than Playwright.
 */
import { defineBrowserCommand } from '@vitest/browser';
import type { BrowserCommand } from 'vitest/node';

interface CdpSession {
  send(method: string, params?: unknown): Promise<unknown>;
}

interface Page {
  context(): { newCDPSession(page: unknown): Promise<CdpSession> };
}

type Context = Readonly<{
  provider: Readonly<{ name: string }>;
  page: Page;
  frame(): Promise<Readonly<{ url(): string }>>;
}>;

type DomNode = Readonly<{
  nodeId: number;
  backendNodeId: number;
  frameId?: string;
  documentURL?: string;
  children?: readonly DomNode[];
  shadowRoots?: readonly DomNode[];
  contentDocument?: DomNode;
}>;

type AxNode = Readonly<{
  nodeId: string;
  ignored: boolean;
  role?: Readonly<{ value: string }>;
  name?: Readonly<{ value: string }>;
  description?: Readonly<{ value: string }>;
  value?: Readonly<{ value: unknown }>;
  properties?: ReadonlyArray<
    Readonly<{ name: string; value: Readonly<{ value?: unknown }> }>
  >;
  childIds?: readonly string[];
  backendDOMNodeId?: number;
}>;

/**
 * One node of the tree that the command returns. `properties` holds the
 * node's CDP properties by name, such as `invalid` and `required`. Only the
 * tree's root can be `ignored`.
 */
export type AccessibilityNode = Readonly<{
  ignored: boolean;
  role: string;
  name: string;
  description: string;
  value: unknown;
  properties: Readonly<Record<string, unknown>>;
  children: readonly AccessibilityNode[];
}>;

const sessions = new WeakMap<Page, CdpSession>();

async function cdpOf(page: Page): Promise<CdpSession> {
  let session = sessions.get(page);

  if (!session) {
    session = await page.context().newCDPSession(page);
    sessions.set(page, session);
  }

  return session;
}

/**
 * The document of the frame at `url`, searched through frames and shadow
 * roots, with the frame's id, which its owner element carries.
 */
function findFrame(
  node: DomNode,
  url: string,
): Readonly<{ document: DomNode; frameId: string }> | undefined {
  const { contentDocument } = node;

  if (contentDocument?.documentURL === url) {
    return { document: contentDocument, frameId: node.frameId! };
  }

  for (const child of [
    ...(node.children ?? []),
    ...(node.shadowRoots ?? []),
    ...(contentDocument ? [contentDocument] : []),
  ]) {
    const found = findFrame(child, url);

    if (found) {
      return found;
    }
  }

  return undefined;
}

// Text nodes carry the names that their ancestors already report.
const TEXT_ROLES = new Set(['StaticText', 'InlineTextBox']);

export const accessibilityBrowserCommands: Readonly<
  Record<string, BrowserCommand<any[]>>
> = {
  /**
   * The accessibility tree below the first element of the test's document
   * that matches `selector`. Ignored nodes are left out and their children
   * take their place, as an assistive technology sees them. Text nodes are
   * left out unless `withText` is true.
   */
  readAccessibilityTree: defineBrowserCommand<[string, boolean?]>(
    async (context, selector, withText = false): Promise<AccessibilityNode> => {
      const { provider, page, frame } = context as unknown as Context;

      if (provider.name !== 'playwright') {
        throw new Error(
          `readAccessibilityTree has no implementation for the ${provider.name} provider`,
        );
      }

      const cdp = await cdpOf(page);
      const { root } = (await cdp.send('DOM.getDocument', {
        depth: -1,
        pierce: true,
      })) as { root: DomNode };
      const { document, frameId } = findFrame(root, (await frame()).url())!;
      const { nodeId } = (await cdp.send('DOM.querySelector', {
        nodeId: document.nodeId,
        selector,
      })) as { nodeId: number };
      const {
        node: { backendNodeId },
      } = (await cdp.send('DOM.describeNode', { nodeId })) as {
        node: DomNode;
      };
      const { nodes } = (await cdp.send('Accessibility.getFullAXTree', {
        frameId,
      })) as { nodes: readonly AxNode[] };
      const byId = new Map(nodes.map((node) => [node.nodeId, node]));
      const childrenOf = (node: AxNode): AccessibilityNode[] =>
        (node.childIds ?? []).flatMap((id) => {
          const child = byId.get(id);

          if (
            !child ||
            (!withText && TEXT_ROLES.has(child.role?.value ?? ''))
          ) {
            return [];
          }

          return child.ignored ? childrenOf(child) : [toTree(child)];
        });
      const toTree = (node: AxNode): AccessibilityNode => ({
        ignored: node.ignored,
        role: node.role?.value ?? '',
        name: node.name?.value ?? '',
        description: node.description?.value ?? '',
        value: node.value?.value,
        properties: Object.fromEntries(
          (node.properties ?? []).map(({ name, value }) => [name, value.value]),
        ),
        children: childrenOf(node),
      });

      // A node that the tree has no entry for is as ignored as one marked so.
      return toTree(
        nodes.find((node) => node.backendDOMNodeId === backendNodeId) ?? {
          nodeId: '',
          ignored: true,
        },
      );
    },
  ),
};
