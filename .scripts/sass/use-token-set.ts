import { glob } from 'node:fs/promises';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SassString, Value } from 'sass-embedded';
import {
  type JSONModule,
  type ProcessedTokenSet,
  type ProcessedTokenSetDescriptor,
  root,
} from '../utils.ts';

const tokenDir = new URL('src/core/tokens-2', root);

async function loadTokensSets(): Promise<
  Readonly<Record<string, ProcessedTokenSet>>
> {
  const result: ProcessedTokenSetDescriptor[] = [];
  const files = glob('**/*.json', { cwd: fileURLToPath(tokenDir) });

  for await (const file of files) {
    const setName = basename(file, '.json');
    const { default: set }: JSONModule<ProcessedTokenSet> = await import(
      fileURLToPath(new URL(file, tokenDir))
    );
    result.push([setName, set]);
  }

  return Object.fromEntries(result);
}

const sets = await loadTokensSets();

const signature = 'use-token-set($set-name)';

function useTokenSet(args: readonly Value[]) {
  const setName = args[0].assertString('set-name').text;

  if (!(setName in sets)) {
    throw new Error(`Token set "${setName}" not found.`);
  }

  const set = sets[setName];

  const map = new Map<SassString>();
}
