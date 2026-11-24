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
    /**
     * Moves the pointer to the viewport point and holds a button down, the left
     * one by default.
     */
    pointerPress(
      x: number,
      y: number,
      button?: 'left' | 'right',
    ): Promise<void>;
    /**
     * Moves the pointer to the viewport point in `steps` moves, holding the
     * button that {@link pointerPress} holds.
     */
    pointerMove(x: number, y: number, steps: number): Promise<void>;
    /** Emulates `prefers-reduced-motion`. Playwright only. */
    emulateReducedMotion(reduced: boolean): Promise<void>;
    /** Dispatches one event of a pen at the viewport point. Chromium only. */
    pen(type: 'down' | 'up', x: number, y: number): Promise<void>;
    /** Emulates `forced-colors`. Playwright only. */
    emulateForcedColors(forced: boolean): Promise<void>;
    /**
     * Dispatches one touch event with fingers at their viewport points: those
     * that are down, and for `touchEnd` those that lift, or all of them if none
     * is given. A finger's id is its index unless a third member gives it.
     * Chromium only.
     */
    touch(
      type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
      ...points: ReadonlyArray<readonly [number, number, id?: number]>
    ): Promise<void>;
    /** Releases the button, the left one by default, that {@link pointerPress} holds. */
    pointerRelease(button?: 'left' | 'right'): Promise<void>;
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
