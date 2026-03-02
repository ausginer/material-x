import type { JSX } from 'react';

export function SummaryOrWarning({
  summary,
  tag,
}: Readonly<{
  summary: string | undefined;
  tag: string;
}>): JSX.Element {
  if (summary) {
    return <>{summary}</>;
  }

  return (
    <blockquote>
      Could not find summary for <code>{tag}</code> in{' '}
      <code>custom-elements.json</code>. Run <code>npm run build:cem</code> and
      rebuild docs.
    </blockquote>
  );
}
