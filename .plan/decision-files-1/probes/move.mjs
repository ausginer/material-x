// Moves each `#### RD-n` of `.plan/00-index.md` and each `#### DRD-n` and `#### DRO-n` of
// `packages/drag/.plan/00-index.md` into `<root>/.plan/decisions/<id>.md`, and rewrites the links,
// by the rules of `decision-files-plan.md` §The move. Run from the repository root:
//
//     node .plan/decision-files-1/probes/move.mjs [--classified <file>]
//
// Each file ends without a newline, as `.editorconfig` asks of Markdown. It regenerates every file from the index and rewrites the links again, so it runs again after a
// merge of `main`, and on its own output it changes nothing. It prints the counts of the plan's
// table, and the lines that no rule decides, which a person reads. `--classified` writes every link
// into an index that rule 4 or 5 touched, with the row that decided it, for a reviewer's sample.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';

const SCOPES = [
  { name: 'repo', index: '.plan/00-index.md', moves: /^RD-\d+$/u },
  {
    name: 'drag',
    index: 'packages/drag/.plan/00-index.md',
    moves: /^(?:DRD|DRO)-\d+$/u,
  },
];

/** The sections whose entries move, and the sentence each keeps (rule 3). */
const SECTIONS = new Set(['## Decisions', '## Owner decisions']);
const SENTENCE =
  'The decisions are in [`decisions/`](decisions/), one file each, named by the identifier.';
const STATUS_SECTION = '## Decision status';

/** `entry.ts`'s heading and closing patterns, so a file is what `entry.sh` prints. */
const ENTRY = /^#### ([A-Za-z][A-Za-z0-9]*-\d+)(?: — (.+))?$/u;
const CLOSES = /^#{1,4} /u;
const SECTION = /^#{1,2} /u;

const LINK = /\]\(([^)\s]+)\)/gu;
const MOVED_ID =
  /(?<![A-Za-z0-9-])(?:[a-z][a-z0-9-]*:)?((?:RD|DRD|DRO)-\d+)\b/gu;
const FINDING = /(?<![A-Za-z0-9-])(?:[a-z][a-z0-9-]*:)?(?:RF|DRF|RQ)-\d+\b/u;
const ENTRY_FRAGMENT = /^(rd|drd|dro)-(\d+)(?:-|$)/u;

const classifiedPath = process.argv.includes('--classified')
  ? process.argv[process.argv.indexOf('--classified') + 1]
  : undefined;

const counts = {
  entries: {},
  bytes: {},
  statusRows: 0,
  insideRelative: 0,
  insideRewritten: 0,
  insideAbsolute: 0,
  elsewhere: { fragMoved: 0, fragOther: 0, toFile: 0, toDir: 0, unchanged: 0 },
  elsewhereFiles: new Set(),
  sameIndexFragments: 0,
  filesWritten: 0,
  filesChanged: new Set(),
};
const person = [];
const classified = [];

const posix = (path) => path.split('\\').join('/');
const relativeLink = (from, to) => {
  const path = posix(relative(from, to));
  return path === '' ? '.' : path;
};

// 1. The moved entries, by `entry.ts`'s rule: from the heading to the next heading of level 1 to 4.
const moved = new Map(); // id -> { scope, file }
const plans = SCOPES.map((scope) => {
  const lines = readFileSync(scope.index, 'utf8').split('\n');
  const decisions = join(dirname(scope.index), 'decisions');
  const entries = [];
  let section = '';

  lines.forEach((line, at) => {
    if (SECTION.test(line)) {
      section = line;
    }

    const match = ENTRY.exec(line);

    if (!match || !scope.moves.test(match[1])) {
      return;
    }

    const rest = lines.slice(at + 1);
    const stop = rest.findIndex((next) => CLOSES.test(next));
    const end = stop < 0 ? lines.length : at + 1 + stop;

    if (!SECTIONS.has(section)) {
      person.push(
        `${scope.index}:${at + 1}: ${match[1]} is under "${section}", which rule 3 doesn't name`,
      );
    }

    entries.push({ id: match[1], title: match[2], start: at, end });
    moved.set(match[1], { scope, file: join(decisions, `${match[1]}.md`) });
  });

  return { scope, lines, decisions, entries };
});

/** The moved identifiers that `line` names, each once. */
const idsOf = (line) =>
  new Set(
    [...line.matchAll(MOVED_ID)].map((m) => m[1]).filter((id) => moved.has(id)),
  );

/** Whether the match at `index` of `line` is inside an inline code span. */
const inCode = (line, index) =>
  (line.slice(0, index).match(/`/gu)?.length ?? 0) % 2 === 1;

/**
 * Rule 5: where a link into `index` goes, by its fragment and the line it is on. `from` is the
 * directory the rewritten link is relative to. Returns the new target, or `undefined` to keep it.
 */
function intoIndex(index, fragment, line, from, where) {
  const scope = SCOPES.find((s) => s.index === index);
  const decisions = join(dirname(index), 'decisions');
  let row;
  let target;

  if (fragment) {
    const match = ENTRY_FRAGMENT.exec(fragment);
    const id = match ? `${match[1].toUpperCase()}-${match[2]}` : undefined;

    if (id && moved.has(id) && moved.get(id).scope === scope) {
      row = 'fragMoved';
      target = relativeLink(from, moved.get(id).file);
    } else {
      if (id && !moved.has(id)) {
        person.push(
          `${where}: #${fragment} names ${id}, which no index entry claims`,
        );
      }

      row = 'fragOther';
    }
  } else {
    const ids = idsOf(line);
    const other = [...ids].filter((id) => moved.get(id).scope !== scope);

    if (FINDING.test(line) || ids.size === 0) {
      row = 'unchanged';
    } else if (other.length > 0) {
      person.push(
        `${where}: a link to ${index} on a line that names ${other.join(', ')} of another scope; kept`,
      );
      row = 'unchanged';
    } else if (ids.size === 1) {
      row = 'toFile';
      target = relativeLink(from, moved.get([...ids][0]).file);
    } else {
      row = 'toDir';
      target = `${relativeLink(from, decisions)}/`;
    }
  }

  classified.push(`${row}\t${where}\t${target ?? '(kept)'}\t${line.trim()}`);
  return { row, target };
}

/**
 * Rewrites the links of `lines`, which were written relative to `source` and are now read from
 * `to`. `inside` marks the text of a moved entry, whose every relative link is rule 4's.
 */
function rewrite(lines, source, to, file, firstLine, inside) {
  let fence = false;

  return lines.map((line, offset) => {
    if (/^\s*(```|~~~)/u.test(line)) {
      fence = !fence;
    }

    const where = `${file}:${firstLine + offset + 1}`;

    return line.replace(LINK, (whole, href, index) => {
      if (/^[a-z][a-z0-9+.-]*:/iu.test(href)) {
        if (inside) {
          counts.insideAbsolute += 1;
        }

        return whole;
      }

      const [path, fragment] = href.split('#');
      const pointsAt = path ? normalize(join(dirname(source), path)) : source;
      const isIndex = SCOPES.some((s) => s.index === posix(pointsAt));

      if (fence || inCode(line, index)) {
        if (inside || isIndex) {
          person.push(`${where}: a link in code, ${href}; kept`);
        }

        return whole;
      }

      if (path.startsWith('/')) {
        person.push(`${where}: a root-relative link, ${href}; kept`);
        return whole;
      }

      if (inside) {
        counts.insideRelative += 1;
      }

      if (isIndex) {
        if (!path && !inside) {
          counts.sameIndexFragments += 1;
        }

        if (!inside) {
          counts.elsewhereFiles.add(file);
        }

        const { row, target } = intoIndex(
          posix(pointsAt),
          fragment,
          line,
          to,
          where,
        );

        if (!inside) {
          counts.elsewhere[row] += 1;
        }

        if (target !== undefined) {
          if (inside) {
            counts.insideRewritten += 1;
          }

          return `](${target})`;
        }

        if (!inside) {
          return whole;
        }
      }

      if (!inside) {
        return whole;
      }

      // Rule 4: the same file, from the entry's new directory.
      const trailing = path.endsWith('/') ? '/' : '';
      const next = `${relativeLink(to, pointsAt)}${trailing}${fragment === undefined ? '' : `#${fragment}`}`;

      if (next !== href) {
        counts.insideRewritten += 1;
      }

      return `](${next})`;
    });
  });
}

const writeIfChanged = (path, text) => {
  let before;

  try {
    before = readFileSync(path, 'utf8');
  } catch {
    before = undefined;
  }

  if (before !== text) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
    counts.filesChanged.add(path);
  }
};

// 2. Drag's status rows (rule 2).
const status = new Map();

for (const { lines } of plans) {
  const at = lines.indexOf(STATUS_SECTION);

  if (at < 0) {
    continue;
  }

  for (const line of lines.slice(at + 1)) {
    if (SECTION.test(line)) {
      break;
    }

    const match = /^\| ((?:DRD|DRO)-\d+) \| (.*) \|$/u.exec(line);

    if (match) {
      status.set(match[1], match[2]);
      counts.statusRows += 1;
    } else if (line.startsWith('|') && !/^\| (Decision|---)/u.test(line)) {
      person.push(`${STATUS_SECTION}: a row rule 2 doesn't read: ${line}`);
    }
  }
}

for (const id of status.keys()) {
  if (!moved.has(id)) {
    person.push(`${STATUS_SECTION}: ${id} has a row and no entry`);
  }
}

// 3. The files (rules 1, 2 and 4), and the indexes without their entries (rule 3).
const rewrittenIndexes = new Map();

for (const { scope, lines, decisions, entries } of plans) {
  for (const { id, title, start, end } of entries) {
    const family = id.replace(/-\d+$/u, '');
    counts.entries[family] = (counts.entries[family] ?? 0) + 1;
    counts.bytes[scope.index] =
      (counts.bytes[scope.index] ?? 0) +
      Buffer.byteLength(lines.slice(start, end).join('\n'));

    const body = rewrite(
      lines.slice(start + 1, end),
      scope.index,
      decisions,
      scope.index,
      start + 1,
      true,
    )
      .join('\n')
      .trim();
    const heading =
      title === undefined ? `#### ${id}` : `#### ${id} — ${title}`;
    // The row's links were written from the index, so rule 4 rewrites them as the entry's.
    const statusParagraph = status.has(id)
      ? `**Status:** ${rewrite([status.get(id)], scope.index, decisions, `${STATUS_SECTION} ${id}`, 0, true)[0]}\n\n`
      : '';

    writeIfChanged(
      moved.get(id).file,
      `${heading}\n\n${statusParagraph}${body}`,
    );
    counts.filesWritten += 1;
  }

  const removed = new Set(
    entries.flatMap(({ start, end }) =>
      Array.from({ length: end - start }, (_, i) => start + i),
    ),
  );
  const kept = [];
  let dropping = false;

  lines.forEach((line, at) => {
    if (SECTION.test(line)) {
      dropping = line === STATUS_SECTION;
    }

    if (dropping || removed.has(at)) {
      return;
    }

    kept.push(line);

    if (
      SECTIONS.has(line) &&
      entries.length > 0 &&
      !lines
        .slice(at + 1)
        .find((next) => next.trim() !== '' && next === SENTENCE)
    ) {
      const next = lines.slice(at + 1).find((l) => l.trim() !== '');

      if (next !== SENTENCE) {
        kept.push('', SENTENCE);
      }
    }
  });

  // The removals leave runs of blank lines where an entry stood. A Markdown file here ends without
  // a newline, as `.editorconfig` says.
  const text = kept
    .join('\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trimEnd();
  rewrittenIndexes.set(scope.index, text);
}

// 4. Every other Markdown file, the indexes' remaining text among them (rule 5).
const tracked = execFileSync(
  'git',
  ['-c', 'core.quotePath=false', 'ls-files', '*.md', '*.mdx'],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(
    (file) =>
      !/^\.plan\/decisions\/|^packages\/drag\/\.plan\/decisions\//u.test(file),
  );

for (const file of tracked) {
  const source = rewrittenIndexes.get(file) ?? readFileSync(file, 'utf8');
  const lines = source.split('\n');
  const next = rewrite(lines, file, dirname(file), file, 0, false).join('\n');

  if (rewrittenIndexes.has(file) || next !== source) {
    writeIfChanged(file, next);
  }

  // A mention of an index that no link pattern reads, such as a reference definition.
  lines.forEach((line, at) => {
    for (const { index } of SCOPES) {
      const name = index.split('/').slice(-2).join('/');

      if (
        line.includes(name) &&
        !/^\s*(```|~~~)/u.test(line) &&
        /^\s*\[[^\]]+\]:\s/u.test(line)
      ) {
        person.push(
          `${file}:${at + 1}: a reference definition of ${index}; kept`,
        );
      }
    }
  });
}

// 5. The report.
const report = {
  entries: counts.entries,
  moved: moved.size,
  bytes: counts.bytes,
  statusRows: counts.statusRows,
  insideRelative: counts.insideRelative,
  insideRewritten: counts.insideRewritten,
  insideAbsolute: counts.insideAbsolute,
  elsewhere: counts.elsewhere,
  elsewhereTotal: Object.values(counts.elsewhere).reduce((a, b) => a + b, 0),
  elsewhereFiles: counts.elsewhereFiles.size,
  sameIndexFragments: counts.sameIndexFragments,
  filesWritten: counts.filesWritten,
  filesChanged: counts.filesChanged.size,
};

process.stdout.write(`${JSON.stringify(report, null, 1)}\n`);
process.stdout.write(
  person.length === 0
    ? 'No line is left to a person.\n'
    : `Left to a person (${person.length}):\n${person.map((line) => `  ${line}`).join('\n')}\n`,
);

if (classifiedPath) {
  writeFileSync(classifiedPath, `${classified.join('\n')}\n`);
}
