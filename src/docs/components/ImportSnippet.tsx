import type { FC } from 'react';

type Props = Readonly<{
  importPath: string;
  tagName: string;
}>;

export const ImportSnippet: FC<Props> = ({ importPath, tagName }) => {
  const code = `import '${importPath}';\n\n<${tagName}></${tagName}>;`;

  return (
    <pre>
      <code>{code}</code>
    </pre>
  );
};
