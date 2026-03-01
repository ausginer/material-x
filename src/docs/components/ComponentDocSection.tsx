import type { FC, ReactNode } from 'react';
import type { ComponentApiDoc } from '../types.ts';
import { ApiTable } from './ApiTable.tsx';
import { ImportSnippet } from './ImportSnippet.tsx';

type Props = Readonly<{
  doc: ComponentApiDoc;
}>;

function renderNameList(
  values: ReadonlyArray<{ name: string; description?: string }>,
  descriptions: Readonly<Record<string, string>> | undefined,
  emptyMessage: string,
): ReactNode {
  if (values.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {values.map((value) => (
          <tr key={value.name}>
            <td>
              <code>{value.name}</code>
            </td>
            <td>{value.description ?? descriptions?.[value.name] ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const ComponentDocSection: FC<Props> = ({ doc }) => (
  <>
    <h2>API reference</h2>

    <h3>Import</h3>
    <ImportSnippet importPath={doc.importPath} tagName={doc.tagName} />

    <h3>Anatomy</h3>
    <h4>Slots</h4>
    {renderNameList(
      doc.slots,
      doc.meta.descriptionOverrides?.slots,
      'No slots are exposed.',
    )}
    <h4>Parts</h4>
    {renderNameList(
      doc.parts,
      doc.meta.descriptionOverrides?.parts,
      'No parts are exposed.',
    )}
    <h4>Exported Parts</h4>
    {renderNameList(
      doc.exportedParts,
      doc.meta.descriptionOverrides?.parts,
      'No exported parts are exposed.',
    )}

    <h3>Properties</h3>
    <ApiTable
      rows={doc.properties}
      descriptions={doc.meta.descriptionOverrides?.properties}
      emptyMessage="No public properties."
    />

    <h3>Events</h3>
    <ApiTable
      rows={doc.events}
      descriptions={doc.meta.descriptionOverrides?.events}
      emptyMessage="No custom events documented."
    />

    <h3>CSS Variables</h3>
    <ApiTable
      rows={doc.cssProperties}
      descriptions={doc.meta.descriptionOverrides?.cssProperties}
      emptyMessage="No public CSS variable overrides are exposed."
    />
  </>
);
