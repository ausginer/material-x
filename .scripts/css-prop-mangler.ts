import type { Visitor } from 'lightningcss';
import { root, type JSONModule } from './utils.ts';
import { fileURLToPath } from 'node:url';

const cacheDir = new URL('node_modules/.cache/css/', root);
const { default: propList }: JSONModule<Readonly<Record<string, string>>> =
  await import(fileURLToPath(new URL('css-private-props.json', cacheDir)), {
    with: { type: 'json' },
  });

export function createMangler(): Visitor<{}> {
  return {
    Declaration: {
      custom({ name, value }) {
        if (name.startsWith('--_')) {
          let mangled = propList[name];

          if (!mangled) {
            throw new Error(`Property ${name} is not collected.`);
          }

          return {
            property: 'custom',
            value: {
              name: `--${mangled}`,
              value,
            },
          };
        }
      },
    },
    Variable(v) {
      const {
        fallback,
        name: { ident, from },
      } = v;
      if (ident.startsWith('--_')) {
        let mangled = propList[ident];

        if (!mangled) {
          throw new Error(`Property ${ident} is not collected.`);
        }

        return {
          type: 'var',
          value: {
            fallback,
            name: {
              ident: `--${mangled}`,
              from,
            },
          },
        };
      }
    },
  };
}
