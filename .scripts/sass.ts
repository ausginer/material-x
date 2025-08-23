import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { compileAsync } from 'sass-embedded';
import { findFileUrl, root } from './utils.ts';

const {
  positionals: [inputFile],
} = parseArgs({
  allowPositionals: true,
});

if (!inputFile) {
  throw new Error('Input file is required');
}

const inputPath = fileURLToPath(new URL(inputFile, root));

const result = await compileAsync(inputPath, {
  importers: [{ findFileUrl }],
});

console.log(result.css);
