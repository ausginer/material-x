import type { FC } from 'react';
import type { APIMemberDoc } from '../types.ts';

type Props = Readonly<{
  rows: readonly APIMemberDoc[];
  descriptions?: Readonly<Record<string, string>>;
  emptyMessage?: string;
}>;

function splitTopLevelUnion(type: string): string[] {
  const parts: string[] = [];
  let depthAngle = 0;
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let start = 0;

  for (let i = 0; i < type.length; i += 1) {
    const char = type[i];

    if (char === '<') {
      depthAngle += 1;
      continue;
    }

    if (char === '>') {
      depthAngle = Math.max(0, depthAngle - 1);
      continue;
    }

    if (char === '(') {
      depthParen += 1;
      continue;
    }

    if (char === ')') {
      depthParen = Math.max(0, depthParen - 1);
      continue;
    }

    if (char === '[') {
      depthBracket += 1;
      continue;
    }

    if (char === ']') {
      depthBracket = Math.max(0, depthBracket - 1);
      continue;
    }

    if (char === '{') {
      depthBrace += 1;
      continue;
    }

    if (char === '}') {
      depthBrace = Math.max(0, depthBrace - 1);
      continue;
    }

    if (
      char === '|' &&
      depthAngle === 0 &&
      depthParen === 0 &&
      depthBracket === 0 &&
      depthBrace === 0
    ) {
      parts.push(type.slice(start, i).trim());
      start = i + 1;
    }
  }

  parts.push(type.slice(start).trim());
  return parts.filter((part) => part.length > 0);
}

function stripNonNullable(type: string): string {
  const marker = 'NonNullable<';
  let result = type;

  while (result.includes(marker)) {
    const markerIndex = result.indexOf(marker);

    if (markerIndex < 0) {
      break;
    }

    let cursor = markerIndex + marker.length;
    let depth = 1;

    while (cursor < result.length && depth > 0) {
      const char = result[cursor];

      if (char === '<') {
        depth += 1;
      } else if (char === '>') {
        depth -= 1;
      }

      cursor += 1;
    }

    if (depth !== 0) {
      break;
    }

    const inner = result.slice(markerIndex + marker.length, cursor - 1).trim();

    result = `${result.slice(0, markerIndex)}${inner}${result.slice(cursor)}`;
  }

  return result;
}

function normalizeType(type: string, optional: boolean): string {
  let value = stripNonNullable(type).trim();

  if (optional) {
    const members = splitTopLevelUnion(value).filter(
      (member) => member !== 'undefined',
    );

    value = members.join(' | ');
  }

  return value;
}

export const ApiTable: FC<Props> = ({ rows, descriptions, emptyMessage }) => {
  if (rows.length === 0) {
    return <p>{emptyMessage ?? 'No entries.'}</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Required</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <td>
              <code>{row.name}</code>
            </td>
            <td>
              <code>{normalizeType(row.type, row.optional)}</code>
            </td>
            <td>{row.optional ? 'No' : 'Yes'}</td>
            <td>{row.description ?? descriptions?.[row.name] ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
