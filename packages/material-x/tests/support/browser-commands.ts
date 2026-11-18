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
    /** Releases the button that {@link pointerPress} holds. */
    pointerRelease(): Promise<void>;
  }
}
