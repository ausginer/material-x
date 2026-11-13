/**
 * The publication step: renames every prefixed property in each emitted
 * JavaScript module to its output name in the committed map, and changes nothing
 * else in the module.
 *
 * Only the name's own characters are replaced, so the statements, every comment
 * and the `sourceMappingURL` stay as they are. The returned map has a segment at
 * every column the step keeps and one at the start of each renamed name. Rolldown
 * passes each segment of the chunk's own map through it, so every token keeps the
 * `src` position it had, a renamed one included, and only its column moves.
 */
import { addSegment, GenMapping, toEncodedMap } from '@jridgewell/gen-mapping';
import type { Rolldown } from 'tsdown';
import { isPrefixed, readNames } from './property-names.ts';

export const RENAME_PROPERTIES = 'drag:rename-properties';

export function renameProperties(
  names: Readonly<Record<string, string>>,
): Rolldown.Plugin {
  return {
    name: RENAME_PROPERTIES,
    renderChunk(code, chunk) {
      // A declaration chunk keeps every name.
      if (chunk.fileName.endsWith('.d.ts')) {
        return null;
      }

      const renamed = readNames(chunk.fileName, code).properties.filter(
        ({ name }) => isPrefixed(name),
      );

      if (renamed.length === 0) {
        return null;
      }

      for (const { name, shorthand } of renamed) {
        if (!Object.hasOwn(names, name)) {
          this.error(
            `${chunk.fileName}: the prefixed property ${name} has no output name in build/property-names.json`,
          );
        }

        if (shorthand) {
          this.error(
            `${chunk.fileName}: the prefixed property ${name} is a shorthand key, which would rename its binding`,
          );
        }
      }

      const map = new GenMapping({ file: chunk.fileName });
      let output = '';
      let line = 0;
      let column = 0;
      let outputColumn = 0;
      let next = 0;

      // Each kept character is one segment; a renamed name is one.
      for (let i = 0; i < code.length;) {
        const property = renamed[next];

        if (property?.start === i) {
          const replacement = names[property.name]!;

          addSegment(map, line, outputColumn, chunk.fileName, line, column);
          output += replacement;
          outputColumn += replacement.length;
          column += property.end - property.start;
          i = property.end;
          next += 1;
        } else if (code[i] === '\n') {
          output += '\n';
          line += 1;
          column = 0;
          outputColumn = 0;
          i += 1;
        } else {
          addSegment(map, line, outputColumn, chunk.fileName, line, column);
          output += code[i];
          column += 1;
          outputColumn += 1;
          i += 1;
        }
      }

      const { mappings } = toEncodedMap(map);

      return {
        code: output,
        map: { version: 3, sources: [chunk.fileName], names: [], mappings },
      };
    },
  };
}
