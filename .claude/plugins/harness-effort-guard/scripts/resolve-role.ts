import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, parse, resolve } from 'node:path';

/**
 * A role's declared effort, resolved from a project agent definition.
 *
 * `out-of-domain` is not a failure: the guard governs only markdown role
 * definitions under `<projectRoot>/.claude/agents/`, and deliberately models
 * neither user-scope agents, plugin agents, built-ins, nor the precedence
 * order between them. A name it does not own is a name it does not judge.
 *
 * `exempt` is not a failure either, and is distinct from `undeclared`: the
 * definition names a model that does not participate in the effort mechanism,
 * so it is governed — owned, resolved and logged — while carrying no effort
 * obligation. `undeclared` is a definition that owes a level and omits it;
 * `exempt` is one that owes none.
 */
export type Resolution =
  | Readonly<{ kind: 'declared'; role: string; effort: string; file: string }>
  | Readonly<{ kind: 'undeclared'; role: string; file: string }>
  | Readonly<{ kind: 'exempt'; role: string; file: string }>
  | Readonly<{ kind: 'out-of-domain'; role: string }>;

type Definition = Readonly<{
  name: string;
  model: string | null;
  effort: string | null;
  file: string;
}>;

const AGENTS_DIR = join('.claude', 'agents');

/**
 * The one `model:` value outside the effort invariant, compared literally.
 *
 * Widening this to a prefix, alias or family match makes the guard a second
 * copy of the runtime's capability matrix, which drifts silently. A model
 * gaining or losing effort support is an edit to this line.
 */
const EFFORTLESS_MODEL = 'haiku';

/**
 * Whether a filesystem rejection means *there is nothing here*, rather than *I
 * cannot tell you*.
 *
 * That difference is the difference between an empty domain and an unchecked
 * one, and only the first is safe to answer with `out-of-domain`. A tree
 * holding no `.claude/agents/` declares no roles, so `ENOENT` and `ENOTDIR` are
 * ordinary absence. Anything else — a permission denied, a symlink loop, an I/O
 * error — is the guard failing to read a domain that may well exist and may
 * well declare the acting role; reporting that as absence would convert a
 * governed role into an unguarded one without a word in the log. Those
 * propagate, and the caller fails closed.
 */
function isAbsence(cause: unknown): boolean {
  const code = (cause as Readonly<{ code?: string }> | null)?.code;

  return code === 'ENOENT' || code === 'ENOTDIR';
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch (cause) {
    if (isAbsence(cause)) {
      return false;
    }

    throw cause;
  }
}

function ancestors(startDir: string): readonly string[] {
  const first = resolve(startDir);
  const chain = [first];

  for (let dir = dirname(first); dir !== chain.at(-1); dir = dirname(dir)) {
    chain.push(dir);
  }

  return chain;
}

function frontmatter(source: string): string {
  if (!source.startsWith('---')) {
    return '';
  }

  const body = source.slice(source.indexOf('\n') + 1);
  const end = body.indexOf('\n---');

  return end < 0 ? '' : body.slice(0, end);
}

function field(block: string, key: string): string | null {
  for (const line of block.split('\n')) {
    const separator = line.indexOf(':');

    if (separator < 0 || line.slice(0, separator).trim() !== key) {
      continue;
    }

    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/gu, '');

    return value === '' ? null : value;
  }

  return null;
}

async function readDefinition(file: string): Promise<Definition> {
  const block = frontmatter(await readFile(file, 'utf8'));

  return {
    // The frontmatter name is what reaches a hook as `agent_type`, and it need
    // not match the filename — `explore.md` declares `Explore`.
    name: field(block, 'name') ?? parse(file).name,
    model: field(block, 'model'),
    effort: field(block, 'effort'),
    file,
  };
}

async function readDefinitions(
  projectRoot: string,
): Promise<readonly Definition[]> {
  const dir = join(projectRoot, AGENTS_DIR);
  let names: readonly string[];

  try {
    names = await readdir(dir);
  } catch (cause) {
    if (isAbsence(cause)) {
      return [];
    }

    throw cause;
  }

  return await Promise.all(
    names
      .filter((name) => name.endsWith('.md'))
      .map((name) => readDefinition(join(dir, name))),
  );
}

/**
 * The nearest ancestor of `startDir` — itself included — holding a
 * `.claude/agents/` directory, or `null` when no ancestor does.
 *
 * The single root-finding rule, shared by both callers so that the launcher's
 * pre-session answer and the hook's in-session answer cannot diverge.
 *
 * Throws when a candidate cannot be inspected at all. `null` states that no
 * ancestor holds a domain, which is a reading of the tree; a candidate the
 * filesystem refuses to describe supports no such reading.
 */
/**
 * Whether `root` is a linked worktree rather than the main checkout.
 *
 * A linked worktree holds `.git` as a regular file pointing at the real
 * repository; the main checkout holds a directory. The distinction matters
 * because a worktree carries its own `.claude/` at its own commit: it can hold
 * part of the role set, which resolves the rest as out-of-domain and allows it,
 * or all of it at a superseded generation, which enforces the wrong contract
 * while looking guarded. Neither is fixable by configuring the worktree.
 *
 * Absence is answered `false`; a filesystem that cannot answer propagates, on
 * the same reasoning as `isAbsence`.
 */
export async function isLinkedWorktree(root: string): Promise<boolean> {
  try {
    return (await stat(join(root, '.git'))).isFile();
  } catch (cause) {
    if (isAbsence(cause)) {
      return false;
    }

    throw cause;
  }
}

export async function findProjectRoot(
  startDir: string,
): Promise<string | null> {
  const chain = ancestors(startDir);
  const holds = await Promise.all(
    chain.map((dir) => isDirectory(join(dir, AGENTS_DIR))),
  );

  return chain.find((_, index) => holds[index]) ?? null;
}

/**
 * Resolve `role` against the definitions in `projectRoot`.
 *
 * `projectRoot` is required and the function reads no environment: its two
 * callers stand on opposite sides of session startup, and a resolver that
 * reached for `CLAUDE_PROJECT_DIR` itself would answer correctly for the hook
 * and resolve against nothing for the launcher — an empty domain that silently
 * allows every role.
 *
 * Throws on a defect in the one namespace the guard owns, of which there are
 * two. Two definitions claiming the same name: choosing one arbitrarily would
 * enforce a declaration the acting role never made, which is strict enforcement
 * of the wrong number. And a definition pairing `model: haiku` with an
 * `effort:`: that file promises a level the runtime will never report, so
 * honouring the effort would enforce an unreachable number while honouring the
 * model would discard a field its author wrote on purpose. Both are raised
 * rather than resolved, as is a filesystem that cannot produce the definitions
 * to judge.
 */
export async function resolveRole(
  projectRoot: string,
  role: string,
): Promise<Resolution> {
  const found = (await readDefinitions(projectRoot)).filter(
    (entry) => entry.name === role,
  );

  if (found.length > 1) {
    const files = found.map((entry) => entry.file).join(', ');

    throw new Error(
      `Role "${role}" is declared by more than one definition: ${files}`,
    );
  }

  const [entry] = found;

  if (!entry) {
    return { kind: 'out-of-domain', role };
  }

  if (entry.model === EFFORTLESS_MODEL) {
    if (entry.effort != null) {
      throw new Error(
        `Role "${role}" declares both model: ${EFFORTLESS_MODEL} and effort: ${entry.effort} in ${entry.file}. ` +
          `${EFFORTLESS_MODEL} does not participate in the effort mechanism, so that level can never be reported; ` +
          'remove one of the two fields.',
      );
    }

    return { kind: 'exempt', role, file: entry.file };
  }

  return entry.effort == null
    ? { kind: 'undeclared', role, file: entry.file }
    : { kind: 'declared', role, effort: entry.effort, file: entry.file };
}

/**
 * CLI for callers that cannot import: `resolve-role.ts <role> [startDir]`.
 *
 * Prints `<projectRoot>\t<declared effort>` and exits 0 for a governed role, the
 * effort field being empty for one outside the effort invariant — a success
 * carrying no level to pin, not a refusal. The separator is written either way,
 * so a caller splitting on it cannot read the root as a level.
 *
 * Every other outcome is a message on stderr and a distinct non-zero exit, so
 * the launcher can refuse without interpreting.
 */
if (import.meta.main) {
  const [role, startDir = process.cwd()] = process.argv.slice(2);

  if (role == null) {
    process.stderr.write('usage: resolve-role.ts <role> [startDir]\n');
    process.exit(64);
  }

  const root = await findProjectRoot(startDir);

  if (root == null) {
    process.stderr.write(`No .claude/agents/ directory above ${startDir}.\n`);
    process.exit(66);
  }

  const resolution = await resolveRole(root, role);

  if (resolution.kind === 'out-of-domain') {
    process.stderr.write(
      `Role "${role}" is not defined in ${join(root, AGENTS_DIR)}.\n`,
    );
    process.exit(67);
  }

  if (resolution.kind === 'undeclared') {
    process.stderr.write(
      `Role "${role}" declares no effort: in ${resolution.file}.\n`,
    );
    process.exit(68);
  }

  process.stdout.write(
    `${root}\t${resolution.kind === 'exempt' ? '' : resolution.effort}\n`,
  );
}
