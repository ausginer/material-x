import type { FC } from 'react';
import type { M3Mapping } from '../types.ts';

type Props = Readonly<{
  m3: M3Mapping;
  deltas: readonly string[];
}>;

export const M3DeltaCallout: FC<Props> = ({ m3, deltas }) => (
  <>
    <p>
      Material 3 references:{' '}
      <a href={m3.overview} rel="noreferrer" target="_blank">
        Overview
      </a>
      {m3.specs ? (
        <>
          {' '}
          |{' '}
          <a href={m3.specs} rel="noreferrer" target="_blank">
            Specs
          </a>
        </>
      ) : null}
      {m3.accessibility ? (
        <>
          {' '}
          |{' '}
          <a href={m3.accessibility} rel="noreferrer" target="_blank">
            Accessibility
          </a>
        </>
      ) : null}
    </p>

    {deltas.length > 0 ? (
      <ul>
        {deltas.map((delta) => (
          <li key={delta}>{delta}</li>
        ))}
      </ul>
    ) : (
      <p>No known behavioral deltas are intentionally introduced.</p>
    )}
  </>
);
