// Reads public issues through GitHub's GraphQL search, and counts what
// `editor` is when the body has an edit. It writes nothing to GitHub.
// Run: node editor.ts '<search query>'...
import { execFileSync } from 'node:child_process';

const QUERY = `query($q: String!, $c: String) {
  search(query: $q, type: ISSUE, first: 50, after: $c) {
    pageInfo { endCursor hasNextPage }
    nodes { ... on Issue { url lastEditedAt editor { login } author { login }
      userContentEdits(first: 10) { totalCount nodes { editedAt editor { login } } } } }
  }
}`;

let read = 0,
  edited = 0,
  fractions = 0,
  editorWithoutEdit = 0,
  several = 0;
const absentBoth: any[] = [],
  absentEditor: any[] = [],
  absentEarlier: any[] = [],
  notLatest: any[] = [];

for (const q of process.argv.slice(2)) {
  for (let c: string | undefined, more = true; more;) {
    const { search } = JSON.parse(
      execFileSync(
        'gh',
        [
          'api',
          'graphql',
          '-f',
          `query=${QUERY}`,
          '-f',
          `q=${q}`,
          ...(c ? ['-f', `c=${c}`] : []),
        ],
        { encoding: 'utf8', maxBuffer: 1 << 26 },
      ),
    ).data;
    for (const i of search.nodes) {
      if (!i.url) continue;
      read += 1;
      if (i.lastEditedAt === null) {
        if (i.editor) editorWithoutEdit += 1;
        continue;
      }
      edited += 1;
      if (i.lastEditedAt.includes('.')) fractions += 1;
      if (i.editor === null) (i.author ? absentEditor : absentBoth).push(i);
      const edits = i.userContentEdits.nodes
        .map((e: any) => [e.editedAt, e.editor?.login ?? null])
        .sort();
      if (i.author && edits.some(([, l]: any) => l === null))
        absentEarlier.push(i);
      const logins = edits.map(([, l]: any) => l);
      if (new Set(logins).size > 1 && i.userContentEdits.totalCount <= 10) {
        several += 1;
        if (logins.at(-1) !== (i.editor?.login ?? null)) notLatest.push(i);
      }
    }
    more = search.pageInfo.hasNextPage;
    c = search.pageInfo.endCursor;
  }
}

console.log(process.argv.slice(2).join('\n'));
console.log(`issues read: ${read}, with an edited body: ${edited}`);
console.log(
  `edited, and editor is null: ${absentBoth.length} whose author is null, ${absentEditor.length} whose author isn't`,
);
console.log(
  `the author isn't null, and one of the first ten edits has a null editor: ${absentEarlier.length}`,
);
console.log(
  `an editor without an edit: ${editorWithoutEdit}, times with a fraction: ${fractions}`,
);
console.log(
  `several editors: ${several}, where editor isn't the latest edit's: ${notLatest.length}`,
);
for (const i of [...absentEditor, ...absentEarlier, ...absentBoth].slice(
  0,
  8,
)) {
  console.log(
    `${i.url} lastEditedAt ${i.lastEditedAt} author ${i.author?.login ?? null} editor ${i.editor?.login ?? null} edits ${JSON.stringify(i.userContentEdits.nodes.map((e: any) => [e.editedAt, e.editor?.login ?? null]))}`,
  );
}
