/**
 * A reading aid for `cants` call-graph output: given an analysis document and a
 * root callable, walk the internal call graph and print it as a tree.
 *
 * This is a **review utility**, not package code. It ships nothing, nothing
 * imports it, and its only contract is with the `cants` `schema_version 2.0.0`
 * document — `application.symbol_table` plus `application.call_graph`.
 *
 * ## What it reads
 *
 * `symbol_table` is keyed by file path and nests callables under `functions`,
 * `types`, `callables` and `fields`. A nested arrow inside a function is a
 * first-class callable with its own `can://` id, so the index recurses through
 * all four bags rather than reading the top level only. `call_graph` is a flat
 * `{ src, dst, prov, weight }` edge list whose endpoints are those ids, plus
 * `external_symbols` (imported and builtin callees) and
 * `synthesized_callables` (anonymous functions, named `owner@line:column`).
 *
 * The symbol table contains a callable literally named `constructor`, so every
 * index here is a `Map`. A plain object is a live bug, not a style preference.
 *
 * ## What it hides, and why
 *
 * Three classes of node are dropped by default, because in a review of what the
 * code does they are noise:
 *
 * - **externals** — every `@external/…` callee. In this document they are
 *   exactly the `prov: ["import"]` edges, and they terminate the walk anyway.
 * - **tests and stories** — they call into the source and never the other way
 *   round, so they can only ever appear as callers.
 * - **declaration files** — the built `*.d.ts` beside `src/` declare every
 *   public name a second time, which is what makes a short root selector
 *   ambiguous. They carry **zero** call edges, so excluding them costs nothing.
 *
 * ## Provenance
 *
 * `prov` is worth reading rather than skipping. `tsc` means the type checker
 * resolved the callee statically; `jelly` means the value-flow analysis found
 * it. An edge only `jelly` found is one the checker could **not** resolve — an
 * indirect call through a slot, a seam or a stored callback — which in a
 * composition-heavy package is the interesting half. Those are marked `~`.
 *
 * Run:
 *
 * ```
 * node .scripts/call-graph.ts src/sortable.ts/sortable
 * node .scripts/call-graph.ts --list sortable
 * node .scripts/call-graph.ts --callers movePlaceholder
 * ```
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

/**
 * Where to look for an analysis document when `--analysis` is not given, in
 * order. The two `.codeanalyzer` entries cover being run from a package
 * directory and from the repository root; the last is where `cants` has been
 * writing drag2's output by hand.
 */
const DEFAULT_ANALYSIS: ReadonlyArray<string | undefined> = [
  process.env['CANTS_ANALYSIS'],
  '.codeanalyzer/analysis.json',
  'packages/drag2/.codeanalyzer/analysis.json',
  '/tmp/drag2-cants/analysis.json',
];

/** The bags a `cants` node can nest further callables under. */
const CALLABLE_BAGS = ['functions', 'types', 'callables', 'fields'] as const;

/**
 * Kinds no edge in this document ever points at: containers, type aliases, and
 * the plain constants under a module's `fields` bag. The bag is still walked —
 * a field can nest a real callable — but the field itself is not one.
 */
const NOT_CALLABLE = new Set(['module', 'type_alias', 'field']);

const TEST_PATH = /(?:^|\/)tests?\/|\.(?:test|spec|stories)\.[cm]?[jt]sx?$/u;

const DIM = '\u001B[2m';
const BOLD = '\u001B[1m';
const RESET = '\u001B[0m';

type RawNode = Readonly<{
  id?: string;
  kind?: string;
  name?: string;
  path?: string;
  module?: string;
  span?: Readonly<{ start: readonly [number, number] }>;
  is_exported?: boolean;
  is_async?: boolean;
  cyclomatic_complexity?: number;
}>;

type RawEdge = Readonly<{
  src: string;
  dst: string;
  prov: readonly string[];
  weight: number;
}>;

type RawApplication = Readonly<{
  id: string;
  symbol_table?: Readonly<Record<string, RawNode>>;
  call_graph?: readonly RawEdge[];
  external_symbols?: Readonly<Record<string, RawNode>>;
  synthesized_callables?: Readonly<Record<string, RawNode>>;
}>;

export type Callable = Readonly<{
  id: string;
  /** The id with the `can://<language>/<application>/` prefix removed. */
  ref: string;
  name: string;
  kind: string;
  path: string;
  line: number;
  isDeclaration: boolean;
  isTest: boolean;
  isExternal: boolean;
  isSynthesized: boolean;
  isAsync: boolean;
  complexity: number | null;
}>;

export type Edge = Readonly<{
  from: string;
  to: string;
  prov: readonly string[];
  weight: number;
}>;

export type Graph = Readonly<{
  application: string;
  callables: ReadonlyMap<string, Callable>;
  /** Callee edges keyed by caller id. */
  out: ReadonlyMap<string, readonly Edge[]>;
  /** Caller edges keyed by callee id. */
  in: ReadonlyMap<string, readonly Edge[]>;
}>;

export type Filter = Readonly<{
  externals: boolean;
  tests: boolean;
  declarations: boolean;
  prov: ReadonlySet<string> | null;
}>;

export type WalkOptions = Readonly<{
  depth: number;
  direction: 'out' | 'in';
  expandRepeats: boolean;
  color: boolean;
}>;

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const bucket = map.get(key);

  if (bucket) {
    bucket.push(value);
  } else {
    map.set(key, [value]);
  }
}

function tail(value: string): string {
  return value.slice(value.lastIndexOf('/') + 1);
}

/** Index one analysis document into a graph. */
export function indexAnalysis(document: unknown): Graph {
  const app = (document as Readonly<{ application: RawApplication }>)
    .application;
  const application = app.id;
  const callables = new Map<string, Callable>();

  const refOf = (id: string): string =>
    id.startsWith(`${application}/`) ? id.slice(application.length + 1) : id;

  const record = (
    node: RawNode,
    path: string,
    overrides: Partial<Callable> = {},
  ): void => {
    const { id } = node;

    if (!id || callables.has(id)) {
      return;
    }

    const ref = refOf(id);

    callables.set(id, {
      id,
      ref,
      name: node.name ?? tail(ref),
      kind: node.kind ?? 'unknown',
      path,
      line: node.span?.start[0] ?? 0,
      isDeclaration: path.endsWith('.d.ts'),
      isTest: TEST_PATH.test(path),
      isExternal: false,
      isSynthesized: false,
      isAsync: node.is_async ?? false,
      complexity: node.cyclomatic_complexity ?? null,
      ...overrides,
    });
  };

  const visit = (node: RawNode, path: string): void => {
    if (node.id && node.kind && !NOT_CALLABLE.has(node.kind)) {
      record(node, path);
    }

    for (const bag of CALLABLE_BAGS) {
      const nested = (node as Readonly<Record<string, unknown>>)[bag];

      for (const child of Object.values(
        (nested ?? {}) as Readonly<Record<string, RawNode>>,
      )) {
        visit(child, path);
      }
    }
  };

  for (const [path, file] of Object.entries(app.symbol_table ?? {})) {
    visit(file, path);
  }

  for (const node of Object.values(app.synthesized_callables ?? {})) {
    // These are all named `<anonymous>`, so the call site is the only identity
    // they have. Two spellings reach here — `owner@line:column`, and an
    // `@synthetic/` id whose whole tail is percent-encoded, slashes included.
    // Decoding has to come after the tail is taken, or `%2F` splits the name.
    record(node, node.path ?? '(synthesized)', {
      isSynthesized: true,
      name: decodeURIComponent(tail(refOf(node.id ?? ''))),
    });
  }

  for (const node of Object.values(app.external_symbols ?? {})) {
    record(node, node.module ?? '(external)', { isExternal: true });
  }

  const out = new Map<string, Edge[]>();
  const incoming = new Map<string, Edge[]>();

  for (const raw of app.call_graph ?? []) {
    const edge: Edge = {
      from: raw.src,
      to: raw.dst,
      prov: raw.prov,
      weight: raw.weight,
    };

    push(out, raw.src, edge);
    push(incoming, raw.dst, edge);
  }

  return { application, callables, out, in: incoming };
}

/**
 * Whether a node survives the filters. An unknown id fails, which is what keeps
 * an edge to an endpoint the document never declared out of the tree.
 */
function keeps(node: Callable | undefined, filter: Filter): boolean {
  return (
    node != null &&
    (filter.externals || !node.isExternal) &&
    (filter.tests || !node.isTest) &&
    (filter.declarations || !node.isDeclaration)
  );
}

function edgesOf(
  graph: Graph,
  id: string,
  filter: Filter,
  direction: 'out' | 'in',
): readonly Edge[] {
  const edges = (direction === 'out' ? graph.out : graph.in).get(id) ?? [];
  const far = direction === 'out' ? 'to' : 'from';
  const { prov } = filter;

  return edges
    .filter(
      (edge) =>
        keeps(graph.callables.get(edge[far]), filter) &&
        (!prov || edge.prov.some((name) => prov.has(name))),
    )
    .sort((a, b) => {
      const left = graph.callables.get(a[far])!;
      const right = graph.callables.get(b[far])!;

      return (
        left.path.localeCompare(right.path) ||
        left.line - right.line ||
        left.name.localeCompare(right.name)
      );
    });
}

/**
 * Resolve a convenience selector to callables.
 *
 * Tried in order, stopping at the first tier that hits: the full `can://` id,
 * the id without its application prefix, a trailing segment of that ref, and
 * finally a bare callable name. Every hit in the winning tier is returned —
 * an ambiguous selector is reported, never silently picked.
 */
export function resolveRoot(
  graph: Graph,
  selector: string,
  filter: Filter,
): readonly Callable[] {
  const pool = [...graph.callables.values()].filter((node) =>
    keeps(node, filter),
  );
  const needle = selector.replace(/^\.?\//u, '');
  const lowered = needle.toLowerCase();

  const tiers: ReadonlyArray<(node: Callable) => boolean> = [
    (node) => node.id === selector,
    (node) => node.ref === needle,
    (node) => node.ref.endsWith(`/${needle}`),
    (node) => node.name === needle,
    (node) => node.name.toLowerCase() === lowered,
  ];

  for (const tier of tiers) {
    const hits = pool.filter(tier);

    if (hits.length > 0) {
      return hits;
    }
  }

  return [];
}

function paint(text: string, code: string, color: boolean): string {
  return color ? `${code}${text}${RESET}` : text;
}

function label(node: Callable, color: boolean): string {
  const site = node.isExternal ? node.path : `${node.path}:${node.line}`;
  const marks = [
    node.isExternal ? 'external' : '',
    node.isSynthesized ? 'anonymous' : '',
    node.isAsync ? 'async' : '',
    ['arrow', 'function', 'external'].includes(node.kind) ? '' : node.kind,
    node.complexity != null && node.complexity > 1
      ? `cc ${node.complexity}`
      : '',
  ].filter(Boolean);
  const suffix = marks.length > 0 ? `  ${marks.join(' ')}` : '';

  return `${paint(node.name, BOLD, color)} ${paint(
    `${site}${suffix}`,
    DIM,
    color,
  )}`;
}

function edgeMark(edge: Edge, color: boolean): string {
  const marks = [
    // `jelly` without `tsc` is a callee the type checker could not resolve.
    edge.prov.includes('tsc') ? '' : '~',
    edge.weight > 1 ? `×${edge.weight}` : '',
  ].filter(Boolean);

  return marks.length > 0 ? ` ${paint(marks.join(' '), DIM, color)}` : '';
}

/**
 * Render the tree rooted at `start`.
 *
 * The traversed subgraph comes back beside the rendering, because that — and
 * not the drawn lines — is what a second output format would consume.
 */
export function walk(
  graph: Graph,
  start: Callable,
  filter: Filter,
  options: WalkOptions,
): Readonly<{
  lines: readonly string[];
  nodes: readonly Callable[];
  edges: readonly Edge[];
}> {
  const lines = [label(start, options.color)];
  const reached = new Map<string, Callable>([[start.id, start]]);
  const seenEdges = new Map<string, Edge>();
  const expanded = new Set<string>([start.id]);
  const far = options.direction === 'out' ? 'to' : 'from';

  const descend = (
    id: string,
    prefix: string,
    depth: number,
    stack: readonly string[],
  ): void => {
    const edges = edgesOf(graph, id, filter, options.direction);

    if (edges.length === 0) {
      return;
    }

    if (depth >= options.depth) {
      const more = `… ${edges.length} more below depth ${options.depth}`;
      lines.push(`${prefix}└─ ${paint(more, DIM, options.color)}`);
      return;
    }

    edges.forEach((edge, index) => {
      const last = index === edges.length - 1;
      const node = graph.callables.get(edge[far])!;
      const branch = last ? '└─ ' : '├─ ';
      const nested = `${prefix}${last ? '   ' : '│  '}`;
      const head = `${prefix}${branch}${label(node, options.color)}${edgeMark(
        edge,
        options.color,
      )}`;

      reached.set(node.id, node);
      seenEdges.set(`${edge.from} ${edge.to}`, edge);

      if (stack.includes(node.id)) {
        lines.push(`${head} ${paint('↺ recursion', DIM, options.color)}`);
        return;
      }

      if (expanded.has(node.id) && !options.expandRepeats) {
        lines.push(`${head} ${paint('↳ shown above', DIM, options.color)}`);
        return;
      }

      lines.push(head);
      expanded.add(node.id);
      descend(node.id, nested, depth + 1, [...stack, node.id]);
    });
  };

  descend(start.id, '', 0, [start.id]);

  return {
    lines,
    nodes: [...reached.values()],
    edges: [...seenEdges.values()],
  };
}

async function findAnalysis(
  explicit: string | undefined,
): Promise<Readonly<{ path: string; document: unknown }>> {
  const candidates = explicit
    ? [explicit]
    : DEFAULT_ANALYSIS.filter((path) => path != null);

  for (const candidate of candidates) {
    const path = resolve(candidate);
    let text: string;

    try {
      // eslint-disable-next-line no-await-in-loop -- `candidates` is a precedence order, not a set: an explicit CANTS_ANALYSIS has to beat a stale /tmp fallback whichever read would have finished first, so this cannot become a race. Sequential also stops at the first hit rather than parsing megabytes it never needed
      text = await readFile(path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }

      throw error;
    }

    const document = JSON.parse(text) as Readonly<{
      application?: RawApplication;
    }>;

    if (
      !document.application?.call_graph ||
      !document.application.symbol_table
    ) {
      throw new Error(
        `${path} is not a cants analysis document. A file whose top level is ` +
          `\`symbol_table\`/\`call_graph\` is the analyzer's own cache ` +
          `(\`.codeanalyzer/analysis_cache.json\`) — a different, pre-\`can://\` ` +
          `format. Point --analysis at the emitted \`analysis.json\`.`,
      );
    }

    return { path, document };
  }

  throw new Error(
    `No analysis document found. Tried:\n${candidates
      .map((path) => `  ${resolve(path)}`)
      .join('\n')}\nPass --analysis <path>, or set CANTS_ANALYSIS.`,
  );
}

const USAGE = `Walk a cants call graph from a chosen root.

  node .scripts/call-graph.ts <root> [options]

  <root>             a can:// id, \`src/sortable.ts/sortable\`, or \`sortable\`

  --analysis <path>  the analysis.json to read. Default, in order:
                     $CANTS_ANALYSIS, .codeanalyzer/analysis.json,
                     packages/drag2/.codeanalyzer/analysis.json,
                     /tmp/drag2-cants/analysis.json
  --depth <n>        maximum depth (default 6; 0 for unlimited)
  --callers          walk callers instead of callees
  --externals        include imported and builtin callees
  --tests            include tests and stories
  --declarations     include .d.ts files
  --prov <a,b>       keep only edges carrying one of these provenances.
                     tsc = resolved by the type checker, jelly = found by
                     value flow, import = external
  --expand-repeats   re-expand a callable everywhere it appears
  --list <pattern>   list matching callables and exit ("" lists all)
  --json             emit the walk as JSON
  --no-color         plain output

Markers: ~ callee the type checker could not resolve, ×N call sites,
         ↺ recursion, ↳ subtree already shown above.
`;

export async function main(argv: readonly string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      analysis: { type: 'string' },
      depth: { type: 'string', default: '6' },
      callers: { type: 'boolean', default: false },
      externals: { type: 'boolean', default: false },
      tests: { type: 'boolean', default: false },
      declarations: { type: 'boolean', default: false },
      prov: { type: 'string' },
      'expand-repeats': { type: 'boolean', default: false },
      list: { type: 'string' },
      json: { type: 'boolean', default: false },
      color: { type: 'boolean', default: true },
      help: { type: 'boolean', default: false },
    },
  });

  if (values.help) {
    process.stdout.write(USAGE);
    return 0;
  }

  const { path, document } = await findAnalysis(values.analysis);
  const graph = indexAnalysis(document);
  const filter: Filter = {
    externals: values.externals,
    tests: values.tests,
    declarations: values.declarations,
    prov: values.prov
      ? new Set(values.prov.split(',').map((name) => name.trim()))
      : null,
  };
  const color = values.color && process.stdout.isTTY;

  if (values.list != null) {
    const pattern = values.list.toLowerCase();
    const hits = [...graph.callables.values()]
      .filter(
        (node) =>
          keeps(node, filter) && node.ref.toLowerCase().includes(pattern),
      )
      .sort((a, b) => a.ref.localeCompare(b.ref));

    process.stdout.write(hits.map((node) => `${node.ref}\n`).join(''));
    process.stderr.write(`\n${hits.length} callables in ${path}\n`);

    return 0;
  }

  const [selector] = positionals;

  if (!selector) {
    process.stderr.write(USAGE);

    return 2;
  }

  const roots = resolveRoot(graph, selector, filter);

  if (roots.length === 0) {
    process.stderr.write(
      `No callable matches \`${selector}\` in ${path}.\n` +
        `Try: node .scripts/call-graph.ts --list ${selector}\n`,
    );

    return 1;
  }

  if (roots.length > 1) {
    process.stderr.write(
      `\`${selector}\` is ambiguous — ${roots.length} matches:\n${roots
        .map((node) => `  ${node.ref}`)
        .join('\n')}\nRe-run with one of them.\n`,
    );

    return 1;
  }

  const depth = Number(values.depth);
  const root = roots[0]!;
  const options: WalkOptions = {
    depth: depth > 0 ? depth : Number.POSITIVE_INFINITY,
    direction: values.callers ? 'in' : 'out',
    expandRepeats: values['expand-repeats'],
    color,
  };
  const { lines, nodes, edges } = walk(graph, root, filter, options);

  if (values.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          analysis: path,
          root: root.ref,
          direction: options.direction,
          nodes,
          edges,
          lines,
        },
        null,
        2,
      )}\n`,
    );

    return 0;
  }

  process.stdout.write(`${lines.join('\n')}\n`);
  process.stderr.write(
    `\n${nodes.length} callables ${
      options.direction === 'out' ? 'reached from' : 'reaching'
    } ${root.ref}  (${path})\n`,
  );

  return 0;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${(error as Error).message}\n`);
  process.exitCode = 1;
}
