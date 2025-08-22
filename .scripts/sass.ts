import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { compileAsync, type CanonicalizeContext } from 'sass-embedded';
import { nodeModulesDir, root } from './utils.ts';

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
  importers: [
    {
      findFileUrl(
        url: string,
        { containingUrl }: CanonicalizeContext,
      ): URL | null {
        if (url.startsWith('~')) {
          return new URL(url.substring(1), nodeModulesDir);
        } else if (containingUrl?.pathname.includes('node_modules/')) {
          return new URL(url, nodeModulesDir);
        }

        return null;
      },
    },
  ],
});

console.log(result.css);
