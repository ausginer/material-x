import type { AccessibilityNode } from './accessibility-commands.node.ts';
import type {
  TokenContractRequest,
  TokenContractResponse,
} from './visual-contracts.node.ts';

declare module 'vitest/browser' {
  interface BrowserCommands {
    resolveTokenContract(
      request: TokenContractRequest,
    ): Promise<TokenContractResponse>;
    /** Moves the pointer to the viewport point and holds its button down. */
    pointerPress(x: number, y: number): Promise<void>;
    /**
     * Moves the pointer to the viewport point in `steps` moves, holding the
     * button that {@link pointerPress} holds.
     */
    pointerMove(x: number, y: number, steps: number): Promise<void>;
    /** Emulates `prefers-reduced-motion`. Playwright only. */
    emulateReducedMotion(reduced: boolean): Promise<void>;
    /** Emulates `forced-colors`. Playwright only. */
    emulateForcedColors(forced: boolean): Promise<void>;
    /**
     * Dispatches one touch event with the fingers that are down at their
     * viewport points. Chromium only.
     */
    touch(
      type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
      ...points: ReadonlyArray<readonly [number, number]>
    ): Promise<void>;
    /** Releases the button that {@link pointerPress} holds. */
    pointerRelease(): Promise<void>;
    /**
     * Chromium's accessibility tree below the first element of the test's
     * document that matches `selector`, with ignored nodes left out. Text nodes
     * are left out unless `withText` is true.
     */
    readAccessibilityTree(
      selector: string,
      withText?: boolean,
    ): Promise<AccessibilityNode>;
  }
}
