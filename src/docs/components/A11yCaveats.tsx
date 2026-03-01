import type { FC } from 'react';
import type { A11yCaveat } from '../types.ts';

type Props = Readonly<{
  caveats: readonly A11yCaveat[];
}>;

export const A11yCaveats: FC<Props> = ({ caveats }) => {
  if (caveats.length === 0) {
    return <p>No component-specific caveats currently tracked.</p>;
  }

  return (
    <ul>
      {caveats.map((caveat) => (
        <li key={caveat.title}>
          <strong>{caveat.title}:</strong> {caveat.detail}
        </li>
      ))}
    </ul>
  );
};
