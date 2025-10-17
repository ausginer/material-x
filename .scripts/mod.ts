import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, SourceTextModule } from 'node:vm';
import { transform } from 'oxc-transform';
import { root } from './utils.ts';

const registry = new Map<string, SourceTextModule>();

async function link(mod: SourceTextModule, importer: URL) {
  const requestedModules = await Promise.all(
    mod.moduleRequests.map(async (request) => {
      // In a full-fledged module system, the resolveAndLinkDependencies would
      // resolve the module with the module cache key `[specifier, attributes]`.
      // In this example, we just use the specifier as the key.
      const { specifier } = request;
      const url = new URL(specifier, importer);

      let requestedModule = registry.get(url.toString());

      if (requestedModule === undefined) {
        const contents = await readFile(url, 'utf8');

        const { code, errors } = transform(
          basename(fileURLToPath(url)),
          contents,
          {},
        );

        if (errors.length > 0) {
          throw new Error('Errors happened', { cause: errors });
        }

        requestedModule = new SourceTextModule(code, {
          context: mod.context,
        });

        registry.set(url.toString(), requestedModule);

        // Resolve the dependencies of the new module as well.
        await link(requestedModule, url);
      }

      return requestedModule;
    }),
  );

  mod.linkRequests(requestedModules);
}

async function load(url: URL): Promise<object> {
  const contents = await readFile(url, 'utf8');
  const { code, errors } = transform(
    basename(fileURLToPath(url)),
    contents,
    {},
  );

  if (errors.length > 0) {
    throw new Error('Errors happened', { cause: errors });
  }

  const context = createContext();
  const mod = new SourceTextModule(code, { context });
  await link(mod, url);
  mod.instantiate();

  return context;
}

const url = new URL('src/button/default/main.css.ts', root);

const data = await load(url);

console.log(data);
