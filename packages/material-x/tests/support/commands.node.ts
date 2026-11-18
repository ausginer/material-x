/**
 * Every browser command that material-x's tests use. Both the package's own
 * Vitest config and the root config register this one map, so a command added
 * here reaches both.
 */
import type { BrowserCommand } from 'vitest/node';
import { inputBrowserCommands } from './input-commands.node.ts';
import { tokenContractCommands } from './visual-contracts.node.ts';

export const materialXBrowserCommands: Readonly<
  Record<string, BrowserCommand<any[]>>
> = { ...tokenContractCommands, ...inputBrowserCommands };
