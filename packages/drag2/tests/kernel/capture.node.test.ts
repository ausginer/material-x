/**
 * **What a unit runs against, asserted over the source.**
 *
 * The kernel is split by lifetime: a façade that exists from `draggable()`'s
 * first statement, and an armed controller constructed complete by
 * construction's unit. The properties below are about _where_ state is read,
 * which no behavioral row can see — a helper that re-reads the operation slot
 * reads the same record the unit's entry resolved, so every outcome agrees.
 * So they are stated as structure, over the parsed source rather than its
 * lines, and each lists its sites exactly: a new reader fails its row until it
 * is classified.
 *
 * **The layer is `node`**: the subject is source text.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SRC = new URL('../../src/', import.meta.url).pathname;
const KERNEL = join(SRC, 'kernel/kernel.ts');
const ARMED = 'ArmedController';

async function parse(path: string): Promise<ts.SourceFile> {
  return ts.createSourceFile(
    path,
    await readFile(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function armedClass(source: ts.SourceFile): ts.ClassDeclaration {
  const found = source.statements.find(
    (statement): statement is ts.ClassDeclaration =>
      ts.isClassDeclaration(statement) && statement.name?.text === ARMED,
  );

  if (!found) {
    throw new Error(`${ARMED} is not declared in kernel.ts`);
  }

  return found;
}

type Access = Readonly<{
  /** The class member the access sits in: `#handleCancel`, `constructor`. */
  member: string;
  /** The `this` field accessed. */
  field: string;
  write: boolean;
  node: ts.PropertyAccessExpression;
}>;

/** Every `this.<field>` access inside `owner`, with its enclosing member. */
function accesses(
  owner: ts.ClassDeclaration,
  source: ts.SourceFile,
): readonly Access[] {
  const found: Access[] = [];

  const visit = (node: ts.Node, member: string): void => {
    let enclosing = member;

    if (node.parent === owner && ts.isClassElement(node)) {
      enclosing = node.name ? node.name.getText(source) : 'constructor';
    }

    if (
      ts.isPropertyAccessExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ThisKeyword
    ) {
      const { parent } = node;

      found.push({
        member: enclosing,
        field: node.name.getText(source),
        write:
          ts.isBinaryExpression(parent) &&
          parent.left === node &&
          parent.operatorToken.kind === ts.SyntaxKind.EqualsToken,
        node,
      });
    }

    ts.forEachChild(node, (child) => {
      visit(child, enclosing);
    });
  };

  visit(owner, '');
  return found;
}

/** The distinct members in which `predicate` holds, sorted. */
const membersWhere = (
  found: readonly Access[],
  predicate: (access: Access) => boolean,
): string[] =>
  [
    ...new Set(found.filter(predicate).map((access) => access.member)),
  ].toSorted();

/**
 * The controller-scope context: realm, root, the bracket, the ingress signal,
 * the spec, the frame pair, the driver, and the controller's diagnostic route
 * with the unwind guard over it. The seam adapters are arrow-valued fields with
 * initializers, and are `readonly` for the same reason; this list is the
 * context that arrives from construction.
 */
const CONTEXT = [
  '#realm',
  '#root',
  '#bracket',
  '#ingress',
  '#spec',
  '#frames',
  '#driver',
  'report',
  '#unwind',
];

describe('the armed controller', () => {
  it('should declare its controller-scope context readonly and definitely assigned', async () => {
    const owner = armedClass(await parse(KERNEL));
    const declared = owner.members
      .filter(ts.isPropertyDeclaration)
      .filter((member) => CONTEXT.includes(member.name.getText()))
      .map((member) => ({
        name: member.name.getText(),
        readonly: ts
          .getModifiers(member)
          ?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword),
        // `!:` would assert an assignment the constructor does not make; `?:`
        // and a `| null` type would admit the absence a reader must then test.
        asserted: member.exclamationToken !== undefined,
        optional: member.questionToken !== undefined,
        nullable: member.type?.getText().includes('null') ?? false,
      }));

    expect(declared).toEqual(
      CONTEXT.map((name) => ({
        name,
        readonly: true,
        asserted: false,
        optional: false,
        nullable: false,
      })),
    );
  });

  it('should assign its controller-scope context in the constructor alone', async () => {
    const source = await parse(KERNEL);
    const written = membersWhere(
      accesses(armedClass(source), source),
      (access) => access.write && CONTEXT.includes(access.field),
    );

    expect(written).toEqual(['constructor']);
  });

  it('should test none of its controller-scope context for presence', async () => {
    const source = await parse(KERNEL);
    // A presence test is a non-null assertion, an optional chain, a negation
    // or a bare condition over the field itself.
    const tested = accesses(armedClass(source), source)
      .filter((access) => CONTEXT.includes(access.field))
      .filter(({ node }) => {
        const { parent } = node;

        return (
          ts.isNonNullExpression(parent) ||
          node.questionDotToken !== undefined ||
          (ts.isPropertyAccessExpression(parent) &&
            parent.questionDotToken !== undefined) ||
          (ts.isPrefixUnaryExpression(parent) &&
            parent.operator === ts.SyntaxKind.ExclamationToken) ||
          (ts.isIfStatement(parent) && parent.expression === node)
        );
      })
      .map(({ member, field }) => `${member}: ${field}`);

    expect(tested).toEqual([]);
  });
});

describe('the current-operation slots', () => {
  it('should be read only at unit entries, request intake, publication and retirement', async () => {
    const source = await parse(KERNEL);
    const read = membersWhere(
      accesses(armedClass(source), source),
      (access) =>
        !access.write &&
        (access.field === '#operation' || access.field === '#activation'),
    );

    expect(read).toEqual([
      // Request intake.
      '#cancelWith',
      '#failOperation',
      // Unit entries: each resolves the records once and passes them down.
      '#handleActivate',
      '#handleCancel',
      '#handleErrorReported',
      '#handleFailed',
      '#handleMove',
      '#handleOpenResolution',
      '#handleRelease',
      '#handleResolutionSettled',
      '#handleStartCommitted',
      '#handleUp',
      // Retirement, steps 3–6 written once.
      '#release',
    ]);
  });

  it('should be written only by the statements that publish or retire them', async () => {
    const source = await parse(KERNEL);
    const written = membersWhere(
      accesses(armedClass(source), source),
      (access) =>
        access.write &&
        (access.field === '#operation' || access.field === '#activation'),
    );

    expect(written).toEqual([
      '#acquireActivation',
      '#mintOperation',
      '#release',
    ]);
  });

  it('should carry the settlement input as the seam capability rather than in a slot', async () => {
    const source = await parse(KERNEL);
    const slots = source.statements.find(
      (statement): statement is ts.TypeAliasDeclaration =>
        ts.isTypeAliasDeclaration(statement) &&
        statement.name.text === 'AttemptSlots',
    );

    expect(
      slots && ts.isTypeLiteralNode(slots.type)
        ? slots.type.members.map((member) => member.name?.getText(source))
        : null,
    ).toEqual(['command', 'resolution']);
  });
});

const EXECUTION = join(SRC, 'kernel/execution.ts');

/**
 * **The bracket's lifecycle accessors, derived rather than listed**: every
 * `ExecutionBracket` getter whose body reads `#lifecycle`. A reader through an
 * accessor added later is found by the census below without editing it, which
 * a list of names would not do.
 */
async function lifecycleAccessors(): Promise<ReadonlySet<string>> {
  const source = await parse(EXECUTION);
  const bracket = source.statements.find(
    (statement): statement is ts.ClassDeclaration =>
      ts.isClassDeclaration(statement) &&
      statement.name?.text === 'ExecutionBracket',
  );

  if (!bracket) {
    throw new Error('ExecutionBracket is not declared in execution.ts');
  }

  return new Set(
    bracket.members
      .filter(ts.isGetAccessorDeclaration)
      .filter((getter) => getter.body?.getText(source).includes('#lifecycle'))
      .map((getter) => getter.name.getText(source)),
  );
}

/**
 * Every read of a ledger fact inside the armed controller, as `member: fact`:
 * the lifecycle request through any of the bracket's lifecycle accessors on
 * `this.#bracket`, an operation's cancel request and registered failure, and a
 * checkpoint's supersession record. A write — the assignment that registers or
 * consumes — is not a read.
 *
 * **Per member, not per placement.** A second read of a fact the list already
 * names, later in the same handler and after the unit has done work, leaves
 * the list unchanged. That limit is inherent to reporting by member, and is
 * stated rather than closed here.
 */
function ledgerReads(
  owner: ts.ClassDeclaration,
  source: ts.SourceFile,
  lifecycle: ReadonlySet<string>,
): string[] {
  const facts = new Set(['cancelRequest', 'failureRegistered', 'superseded']);
  const found = new Set<string>();

  const visit = (node: ts.Node, member: string): void => {
    let enclosing = member;

    if (node.parent === owner && ts.isClassElement(node)) {
      enclosing = node.name ? node.name.getText(source) : 'constructor';
    }

    if (ts.isPropertyAccessExpression(node)) {
      const name = node.name.getText(source);
      const { parent } = node;
      const written =
        ts.isBinaryExpression(parent) &&
        parent.left === node &&
        parent.operatorToken.kind === ts.SyntaxKind.EqualsToken;
      const read =
        (lifecycle.has(name) &&
          node.expression.getText(source) === 'this.#bracket') ||
        facts.has(name);

      if (!written && read) {
        found.add(`${enclosing}: ${name}`);
      }
    }

    ts.forEachChild(node, (child) => {
      visit(child, enclosing);
    });
  };

  visit(owner, '');
  return [...found].toSorted();
}

/**
 * **No unit reads the ledger after its entry.** The places left in the armed
 * controller are request intake, the runner's refusal before an ingress pass,
 * and unit entries. The diagnostic refusal is a module function's, and the
 * runner's own reading is the bracket's; both are outside this class and are
 * located by the source-wide census below.
 */
describe('the ledger', () => {
  it('should be read only at intake, the ingress refusal and unit entries', async () => {
    const source = await parse(KERNEL);

    expect(
      ledgerReads(armedClass(source), source, await lifecycleAccessors()),
    ).toEqual([
      // Intake: whether a request is registered at all.
      '#cancelWith: cancelRequest',
      '#cancelWith: closed',
      // Failure intake also captures the supersession record.
      '#failOperation: cancelRequest',
      '#failOperation: closed',
      // Unit entries. `ACTIVATE` and `MOVE` at `PENDING` decline activation
      // while a cancel is held.
      '#handleActivate: cancelRequest',
      '#handleCancel: cancelRequest',
      '#handleFailed: cancelRequest',
      '#handleFailed: superseded',
      '#handleMove: cancelRequest',
      '#handleOpenResolution: cancelRequest',
      '#handleOpenResolution: failureRegistered',
      '#handleStartCommitted: cancelRequest',
      // The runner's refusal before a native ingress pass is admitted.
      '#onPointerDown: idle',
    ]);
  });

  it('should derive the lifecycle accessors it matches from the bracket', async () => {
    // Non-vacuity for the row above: a derivation that found nothing would
    // match no lifecycle read and pass the intake rows by omission.
    expect([...(await lifecycleAccessors())].toSorted()).toEqual([
      'closed',
      'idle',
    ]);
  });
});

/** Every `.ts` file under `dir`, relative to `src/`, sorted. */
async function sources(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && /\.tsx?$/u.test(entry.name))
    .map((entry) =>
      join(entry.parentPath, entry.name)
        .slice(SRC.length)
        .replaceAll('\\', '/'),
    )
    .toSorted();
}

/**
 * **The read census, by location, over the whole of `src/`.** Every read of
 * the lifecycle — `#lifecycle` itself, or one of the bracket's lifecycle
 * accessors on any receiver — and of an operation's cancel request or
 * registered failure, as `file › Class.member: fact`. A function outside a
 * class is reported by its own name.
 */
async function readCensus(): Promise<string[]> {
  const lifecycle = await lifecycleAccessors();
  const facts = new Set(['cancelRequest', 'failureRegistered']);
  const found = new Set<string>();

  const files = await sources(SRC);
  const parsed = await Promise.all(files.map((file) => parse(join(SRC, file))));

  for (const [index, file] of files.entries()) {
    const source = parsed[index]!;

    const visit = (node: ts.Node, where: string): void => {
      let enclosing = where;

      if (ts.isClassElement(node) && ts.isClassLike(node.parent)) {
        const owner = node.parent.name?.getText(source) ?? '(class)';
        const name = node.name ? node.name.getText(source) : 'constructor';

        enclosing = `${owner}.${name}`;
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        enclosing = node.name.getText(source);
      }

      if (ts.isPropertyAccessExpression(node)) {
        const name = node.name.getText(source);
        const { parent } = node;
        const written =
          ts.isBinaryExpression(parent) &&
          parent.left === node &&
          parent.operatorToken.kind === ts.SyntaxKind.EqualsToken;

        if (
          !written &&
          (name === '#lifecycle' || lifecycle.has(name) || facts.has(name))
        ) {
          found.add(`${file} › ${enclosing}: ${name}`);
        }
      }

      ts.forEachChild(node, (child) => {
        visit(child, enclosing);
      });
    };

    visit(source, '(module)');
  }

  return [...found].toSorted();
}

describe('the read census', () => {
  it('should find lifecycle and request reads only at the runner, intake, the channel and unit entries', async () => {
    expect(await readCensus()).toEqual([
      // The runner: the bracket's own reads of the lifecycle request, before
      // each queued unit, at the outermost boundary, at depth-0 application
      // and before an ingress pass — and the two accessors that expose it.
      'kernel/execution.ts › ExecutionBracket.#leave: #lifecycle',
      'kernel/execution.ts › ExecutionBracket.#step: #lifecycle',
      'kernel/execution.ts › ExecutionBracket.closed: #lifecycle',
      'kernel/execution.ts › ExecutionBracket.dispatch: #lifecycle',
      'kernel/execution.ts › ExecutionBracket.idle: #lifecycle',
      'kernel/execution.ts › ExecutionBracket.requestClose: #lifecycle',
      'kernel/execution.ts › ExecutionBracket.runIngress: idle',
      // Intake in the armed controller.
      'kernel/kernel.ts › ArmedController.#cancelWith: cancelRequest',
      'kernel/kernel.ts › ArmedController.#cancelWith: closed',
      'kernel/kernel.ts › ArmedController.#failOperation: cancelRequest',
      'kernel/kernel.ts › ArmedController.#failOperation: closed',
      // Unit entries.
      'kernel/kernel.ts › ArmedController.#handleActivate: cancelRequest',
      'kernel/kernel.ts › ArmedController.#handleCancel: cancelRequest',
      'kernel/kernel.ts › ArmedController.#handleFailed: cancelRequest',
      'kernel/kernel.ts › ArmedController.#handleMove: cancelRequest',
      'kernel/kernel.ts › ArmedController.#handleOpenResolution: cancelRequest',
      'kernel/kernel.ts › ArmedController.#handleOpenResolution: failureRegistered',
      'kernel/kernel.ts › ArmedController.#handleStartCommitted: cancelRequest',
      // The runner's refusal before a native ingress pass is admitted.
      'kernel/kernel.ts › ArmedController.#onPointerDown: idle',
      // The façade's dispatch intake.
      'kernel/kernel.ts › Kernel.dispatch: closed',
      // The diagnostic refusal, shared by the kernel's route and every minted
      // channel.
      'kernel/kernel.ts › deliverUnlessApplied: closed',
    ]);
  });

  it('should find no lifecycle or request read outside the kernel', async () => {
    // The stated half of the property, separately: a reader in a behavior
    // fails here even if the list above were edited to admit it.
    expect(
      (await readCensus()).filter((entry) => !entry.startsWith('kernel/')),
    ).toEqual([]);
  });
});

describe('teardown', () => {
  it('should write steps 3–6 once', async () => {
    const source = await parse(KERNEL);
    const found = accesses(armedClass(source), source);
    // Step 4 and step 6, by the one expression each is written as.
    const sites = (text: string): string[] =>
      membersWhere(found, ({ node }) => node.parent.getText(source) === text);

    expect([sites('this.#spec.retire'), sites('this.#frames.retire')]).toEqual([
      ['#release'],
      ['#release'],
    ]);
  });

  it('should reach those steps only through retirement and physical teardown', async () => {
    const source = await parse(KERNEL);

    expect(
      membersWhere(
        accesses(armedClass(source), source),
        (access) =>
          access.field === '#release' &&
          ts.isCallExpression(access.node.parent),
      ),
    ).toEqual(['#retireOperation', 'teardown']);
  });

  it('should retire only an operation the caller names', async () => {
    const owner = armedClass(await parse(KERNEL));
    const retire = owner.members.find(
      (member): member is ts.MethodDeclaration =>
        ts.isMethodDeclaration(member) &&
        member.name.getText() === '#retireOperation',
    );

    // No `null` mode: a retirement is always of one identity, and a stale one
    // is a no-op.
    expect(
      retire?.parameters.map((parameter) => parameter.type?.getText()),
    ).toEqual(['OperationIdentity']);
  });
});

/** Every library module under `src/`, parsed, by its path relative to it. */
async function library(): Promise<
  ReadonlyArray<readonly [name: string, source: ts.SourceFile]>
> {
  const names = (await readdir(SRC, { recursive: true }))
    .filter((name) => /\.tsx?$/u.test(name))
    .toSorted();
  const sources = await Promise.all(
    names.map(async (name) => await parse(join(SRC, name))),
  );

  return names.map((name, index) => [name, sources[index]!] as const);
}

/** A class's static fields that are not `readonly`. */
const mutableStatics = (owner: ts.ClassDeclaration): string[] =>
  owner.members
    .filter(ts.isPropertyDeclaration)
    .filter((member) => {
      const kinds = (ts.getModifiers(member) ?? []).map(
        (modifier) => modifier.kind,
      );

      return (
        kinds.includes(ts.SyntaxKind.StaticKeyword) &&
        !kinds.includes(ts.SyntaxKind.ReadonlyKeyword)
      );
    })
    .map((member) => `static ${member.name.getText()}`);

/** A module's top-level `let` and `var` declarations, and mutable statics. */
const mutableBindings = (source: ts.SourceFile): string[] =>
  source.statements.flatMap((statement) => {
    if (ts.isVariableStatement(statement)) {
      // The list's first token is its `const`, `let` or `var` keyword.
      return statement.declarationList.getFirstToken(source)?.kind ===
        ts.SyntaxKind.ConstKeyword
        ? []
        : [statement.declarationList.getText(source)];
    }

    return ts.isClassDeclaration(statement) ? mutableStatics(statement) : [];
  });

/**
 * The expression a type-only wrapper wraps: `as`, `as const`, `satisfies`,
 * parentheses, a non-null assertion and an angle-bracket assertion change
 * nothing at runtime, so the census looks through every one of them.
 */
function unwrapped(expression: ts.Expression): ts.Expression {
  let inner = expression;

  while (
    ts.isAsExpression(inner) ||
    ts.isSatisfiesExpression(inner) ||
    ts.isParenthesizedExpression(inner) ||
    ts.isNonNullExpression(inner) ||
    ts.isTypeAssertionExpression(inner)
  ) {
    inner = inner.expression;
  }

  return inner;
}

/**
 * A module's top-level constants initialized with an object, array or `new`,
 * however the initializer is type-asserted.
 */
const objectConstants = (source: ts.SourceFile): string[] =>
  source.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .filter(({ initializer }) => {
      if (!initializer) {
        return false;
      }

      const value = unwrapped(initializer);

      return (
        ts.isObjectLiteralExpression(value) ||
        ts.isArrayLiteralExpression(value) ||
        ts.isNewExpression(value)
      );
    })
    .map((declaration) => declaration.name.getText(source));

/**
 * **`src/` holds no module-level mutable binding.** State a unit reads lives on
 * a controller and is reached through it; a binding at module scope would be
 * shared by every controller in the realm and reachable by none of the rules
 * above.
 */
describe('module scope', () => {
  it('should hold no mutable binding in src', async () => {
    const mutable = (await library()).flatMap(([name, source]) =>
      mutableBindings(source).map((binding) => `${name}: ${binding}`),
    );

    expect(mutable).toEqual([]);
  });

  // Each is read without being written, by one of four uses, and the list is
  // exact so a new one is classified. Stories are Storybook's modules, not the
  // library's: no package entry reaches them.
  //
  // - a frame default handed to `Object.assign` as a source;
  // - a key, property or event-type table that is only iterated;
  // - `ACCEPTED`, compared by identity only;
  // - a resolution factory table, read by consumers and never by the library.
  it('should hold only these object-valued constants in library modules', async () => {
    const objects = (await library())
      .filter(([name]) => !name.endsWith('.stories.tsx'))
      .flatMap(([name, source]) =>
        objectConstants(source).map((constant) => `${name}: ${constant}`),
      );

    expect(objects).toEqual([
      'free-drag/config.ts: LAST_WINS_KEYS',
      'free-drag/domain.ts: ACCEPTED',
      'free-drag/domain.ts: FreeDragResolution',
      'free-drag/frames.ts: DEFAULT_PART',
      'kernel/frames.ts: KERNEL_FRAME_KEYS',
      'kernel/frames.ts: DEFAULT_FRAME',
      'kernel/pointer.ts: SESSION_POINTER_EVENTS',
      'kernel/presentation.ts: UA_PROPS',
      'kernel/presentation.ts: LIFTED_PROPS',
      'sortable/config.ts: LAST_WINS_KEYS',
      'sortable/domain.ts: ACCEPTED',
      'sortable/domain.ts: ReorderResolution',
      'sortable/frames.ts: DEFAULT_PART',
    ]);
  });
});
