import type { FC } from 'react';
import type { ComponentApiDoc } from '../types.ts';
import { A11yCaveats } from './A11yCaveats.tsx';
import { M3DeltaCallout } from './M3DeltaCallout.tsx';

type Props = Readonly<{
  doc: ComponentApiDoc;
}>;

export const ComponentGuideSection: FC<Props> = ({ doc }) => (
  <>
    {doc.meta.summary ? <p>{doc.meta.summary}</p> : null}

    <h2>When to use</h2>
    <ul>
      {doc.meta.whenToUse.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>

    <h2>When not to use / pitfalls</h2>
    <ul>
      {(doc.meta.pitfalls ?? []).map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>

    <h2>Accessibility notes</h2>
    <A11yCaveats caveats={doc.meta.a11yCaveats} />

    <h2>Material 3 reference</h2>
    <M3DeltaCallout deltas={doc.meta.deltas} m3={doc.meta.m3} />
  </>
);
