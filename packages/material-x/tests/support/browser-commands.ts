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
     * Drags one emulated finger from the viewport point by the distance.
     * Chromium only.
     */
    touchDrag(x: number, y: number, dx: number, dy: number): Promise<void>;
    /** Releases the button that {@link pointerPress} holds. */
    pointerRelease(): Promise<void>;
    /**
     * Chromium's accessibility tree below the first element of the test's
     * document that matches `selector`, with ignored nodes left out.
     */
    readAccessibilityTree(selector: string): Promise<AccessibilityNode>;
  }
}
