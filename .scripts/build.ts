import { glob, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { transform } from 'oxc-transform';
import { compileCSS } from './css/css.ts';
import type { JSModule } from './utils.ts';

const {
  values: { outDir },
  positionals: [inputDir],
} = parseArgs({
  options: {
    outDir: {
      type: 'string',
      short: 'o',
    },
  },
  allowPositionals: true,
});

if (!inputDir) {
  throw new Error('No directory to build specified');
}

if (!outDir) {
  throw new Error('No directory for output specified');
}

const root = pathToFileURL(`${process.cwd()}/`);
const inputDirURL = new URL(`${inputDir}/`, root);
const outDirURL = new URL(`${outDir}/`, root);

function isEmptyCode(code: string): boolean {
  return code.trim() === 'export {};';
}

for await (const file of glob('**/*.ts', { cwd: inputDirURL })) {
  const url = new URL(file, inputDirURL);

  if (file.endsWith('.css.ts')) {
    const { default: css }: JSModule<string> = await import(fileURLToPath(url));

    if (css.trim() === '') {
      continue;
    }

    const { code, map } = await compileCSS(url, css, { isProd: true });

    const codeURL = new URL(file.replace('.css.ts', '.js'), outDirURL);
    const mapURL = new URL(file.replace('.css.ts', '.js.map'), outDirURL);

    await mkdir(dirname(fileURLToPath(codeURL)), { recursive: true });

    await Promise.all([
      writeFile(codeURL, code, 'utf8'),
      writeFile(mapURL, JSON.stringify(map), 'utf8'),
    ]);
  } else {
    const contents = await readFile(url, 'utf8');
    const { code, map, declaration, declarationMap, errors } = await transform(
      file,
      contents,
      {
        sourceType: 'module',
        lang: 'ts',
        cwd: fileURLToPath(root),
        sourcemap: true,
        typescript: {
          declaration: {
            stripInternal: true,
          },
          onlyRemoveTypeImports: true,
          rewriteImportExtensions: 'rewrite',
        },
        target: 'esnext',
      },
    );

    if (errors.length > 0) {
      throw new Error(`${url} building failed`, {
        cause: errors.map(({ message }) => new Error(message)),
      });
    }

    const isEmpty = isEmptyCode(code);

    if (isEmpty && declaration!.trim() === '') {
      continue;
    }

    const codeURL = new URL(file.replace('.ts', '.js'), outDirURL);
    const mapURL = new URL(file.replace('.ts', '.js.map'), outDirURL);
    const declarationURL = new URL(file.replace('.ts', '.d.ts'), outDirURL);
    const declarationMapURL = new URL(
      file.replace('.ts', '.d.ts.map'),
      outDirURL,
    );

    await mkdir(dirname(fileURLToPath(codeURL)), { recursive: true });

    await Promise.all([
      !isEmpty && writeFile(codeURL, code, 'utf8'),
      !isEmpty && writeFile(mapURL, JSON.stringify(map), 'utf8'),
      writeFile(declarationURL, declaration!, 'utf8'),
      writeFile(declarationMapURL, JSON.stringify(declarationMap), 'utf8'),
    ]);
  }
}
