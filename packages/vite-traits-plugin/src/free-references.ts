/**
 * Free-identifier analysis of a class-based trait's member, so the member's
 * source can be copied into another module with every name it reads still
 * resolving to the same binding.
 *
 * The analysis is conservative: it models an allowlist of node types and calls
 * `fail` on any other, so a construct it can't account for retains the trait
 * rather than being copied with a guessed meaning. `var`, function and class
 * declarations are outside the allowlist because they hoist past the blocks
 * that the analysis scopes; `super`, any `eval` reference and `import.meta` are outside
 * it because they mean something else in the consumer.
 */

/** The fields every oxc AST node carries. */
type AstNode = Readonly<{ type: string; start: number; end: number }>;

/** A name a member reads or writes that no scope inside the member binds. */
export type FreeReference = Readonly<{
  name: string;
  /** `[start, end)` offsets of the identifier in the origin source. */
  start: number;
  end: number;
  /** The identifier is a shorthand property, `{ name }`. */
  shorthand: boolean;
  /** The reference assigns the binding. */
  write: boolean;
}>;

/** Reports a construct the analysis doesn't model. */
export type Fail = (detail: string) => never;

type Scope = Readonly<{ names: ReadonlySet<string>; parent: Scope | null }>;

/**
 * The runtime child fields of each node type whose children need no scoping
 * of their own. A type absent from this table and from {@link visit}'s cases
 * isn't modeled.
 */
const CHILDREN: Readonly<Record<string, readonly string[]>> = {
  ArrayExpression: ['elements'],
  AwaitExpression: ['argument'],
  BinaryExpression: ['left', 'right'],
  BreakStatement: [],
  CallExpression: ['callee', 'arguments'],
  ChainExpression: ['expression'],
  ConditionalExpression: ['test', 'consequent', 'alternate'],
  ContinueStatement: [],
  DebuggerStatement: [],
  DoWhileStatement: ['body', 'test'],
  EmptyStatement: [],
  ExpressionStatement: ['expression'],
  IfStatement: ['test', 'consequent', 'alternate'],
  LabeledStatement: ['body'],
  Literal: [],
  LogicalExpression: ['left', 'right'],
  NewExpression: ['callee', 'arguments'],
  ParenthesizedExpression: ['expression'],
  ReturnStatement: ['argument'],
  SequenceExpression: ['expressions'],
  SpreadElement: ['argument'],
  TaggedTemplateExpression: ['tag', 'quasi'],
  TemplateLiteral: ['expressions'],
  ThisExpression: [],
  ThrowStatement: ['argument'],
  TSAsExpression: ['expression'],
  TSInstantiationExpression: ['expression'],
  TSNonNullExpression: ['expression'],
  TSSatisfiesExpression: ['expression'],
  TSTypeAssertion: ['expression'],
  UnaryExpression: ['argument'],
  WhileStatement: ['test', 'body'],
  YieldExpression: ['argument'],
};

/** TS wrappers an assignment target may carry around its runtime target. */
const TARGET_WRAPPERS = new Set([
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
]);

function field(node: AstNode, key: string): unknown {
  return (node as unknown as Readonly<Record<string, unknown>>)[key];
}

function isNode(value: unknown): value is AstNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

/** The nodes a child field holds: one node, an array of them, or none. */
function nodes(value: unknown): readonly AstNode[] {
  if (Array.isArray(value)) {
    return value.filter(isNode);
  }

  return isNode(value) ? [value] : [];
}

function child(node: AstNode, key: string): AstNode | null {
  const value = field(node, key);

  return isNode(value) ? value : null;
}

function nameOf(identifier: AstNode): string {
  return field(identifier, 'name') as string;
}

/** Adds every name a binding pattern declares to `into`. */
export function addPatternNames(
  pattern: AstNode,
  into: Set<string>,
  fail: Fail,
): void {
  switch (pattern.type) {
    case 'Identifier':
      into.add(nameOf(pattern));
      return;
    case 'AssignmentPattern':
      addPatternNames(child(pattern, 'left')!, into, fail);
      return;
    case 'RestElement':
      addPatternNames(child(pattern, 'argument')!, into, fail);
      return;
    case 'ArrayPattern':
      for (const element of nodes(field(pattern, 'elements'))) {
        addPatternNames(element, into, fail);
      }
      return;
    case 'ObjectPattern':
      for (const property of nodes(field(pattern, 'properties'))) {
        addPatternNames(
          property.type === 'RestElement'
            ? property
            : child(property, 'value')!,
          into,
          fail,
        );
      }
      return;
    default:
      fail(`a binding pattern of type ${pattern.type} isn't modeled`);
  }
}

/** Walks one member's function, collecting the names no inner scope binds. */
class ReferenceCollector {
  readonly #references: FreeReference[] = [];
  readonly #fail: Fail;

  constructor(fail: Fail) {
    this.#fail = fail;
  }

  get references(): readonly FreeReference[] {
    return this.#references;
  }

  #reference(
    identifier: AstNode,
    scope: Scope | null,
    shorthand: boolean,
    write: boolean,
  ): void {
    const name = nameOf(identifier);
    // Any reference retains the trait: `(eval)(src)` and `(eval as F)(src)` are
    // direct calls that read the consumer's scope. Strict code, which a class
    // body is, can't bind `eval`, so no scope lookup is needed.
    if (name === 'eval') {
      this.#fail('a member references eval');
    }
    for (let current = scope; current; current = current.parent) {
      if (current.names.has(name)) {
        return;
      }
    }
    this.#references.push({
      name,
      start: identifier.start,
      end: identifier.end,
      shorthand,
      write,
    });
  }

  /** A scope holding the `let`, `const` and `using` names a list declares. */
  #lexicalScope(statements: readonly AstNode[], parent: Scope | null): Scope {
    const names = new Set<string>();
    for (const statement of statements) {
      if (statement.type === 'VariableDeclaration') {
        for (const declarator of nodes(field(statement, 'declarations'))) {
          addPatternNames(child(declarator, 'id')!, names, this.#fail);
        }
      }
    }

    return { names, parent };
  }

  /** Visits the default values and computed keys inside a binding pattern. */
  #visitPattern(pattern: AstNode, scope: Scope | null): void {
    const decorators = field(pattern, 'decorators');
    if (Array.isArray(decorators) && decorators.length > 0) {
      this.#fail('a parameter has a decorator');
    }
    switch (pattern.type) {
      case 'Identifier':
        return;
      case 'AssignmentPattern':
        this.#visitPattern(child(pattern, 'left')!, scope);
        this.#visit(child(pattern, 'right')!, scope);
        return;
      case 'RestElement':
        this.#visitPattern(child(pattern, 'argument')!, scope);
        return;
      case 'ArrayPattern':
        for (const element of nodes(field(pattern, 'elements'))) {
          this.#visitPattern(element, scope);
        }
        return;
      case 'ObjectPattern':
        for (const property of nodes(field(pattern, 'properties'))) {
          if (property.type === 'RestElement') {
            this.#visitPattern(property, scope);
            continue;
          }
          if (field(property, 'computed') === true) {
            this.#visit(child(property, 'key')!, scope);
          }
          this.#visitPattern(child(property, 'value')!, scope);
        }
        return;
      default:
        this.#fail(`a binding pattern of type ${pattern.type} isn't modeled`);
    }
  }

  /** Visits an assignment target, whose identifiers are written. */
  #visitTarget(target: AstNode, scope: Scope | null): void {
    if (TARGET_WRAPPERS.has(target.type)) {
      this.#visitTarget(child(target, 'expression')!, scope);
      return;
    }
    switch (target.type) {
      case 'Identifier':
        this.#reference(target, scope, false, true);
        return;
      case 'MemberExpression':
        this.#visit(target, scope);
        return;
      case 'AssignmentPattern':
        this.#visitTarget(child(target, 'left')!, scope);
        this.#visit(child(target, 'right')!, scope);
        return;
      case 'RestElement':
        this.#visitTarget(child(target, 'argument')!, scope);
        return;
      case 'ArrayPattern':
        for (const element of nodes(field(target, 'elements'))) {
          this.#visitTarget(element, scope);
        }
        return;
      case 'ObjectPattern':
        for (const property of nodes(field(target, 'properties'))) {
          if (property.type === 'RestElement') {
            this.#visitTarget(property, scope);
            continue;
          }
          if (field(property, 'computed') === true) {
            this.#visit(child(property, 'key')!, scope);
          }
          const value = child(property, 'value')!;
          if (field(property, 'shorthand') !== true) {
            this.#visitTarget(value, scope);
          } else if (value.type === 'AssignmentPattern') {
            this.#reference(child(value, 'left')!, scope, true, true);
            this.#visit(child(value, 'right')!, scope);
          } else {
            this.#reference(value, scope, true, true);
          }
        }
        return;
      default:
        this.#fail(`an assignment target of type ${target.type} isn't modeled`);
    }
  }

  visitFunction(node: AstNode, scope: Scope | null): void {
    const names = new Set<string>();
    const id = child(node, 'id');
    if (id) {
      names.add(nameOf(id));
    }
    const params = nodes(field(node, 'params'));
    for (const param of params) {
      if (param.type === 'TSParameterProperty') {
        this.#fail("a parameter property isn't modeled");
      }
      addPatternNames(param, names, this.#fail);
    }
    const inner: Scope = { names, parent: scope };
    for (const param of params) {
      this.#visitPattern(param, inner);
    }

    const body = child(node, 'body');
    if (body?.type === 'BlockStatement') {
      this.#visitStatements(nodes(field(body, 'body')), inner);
    } else if (body) {
      this.#visit(body, inner);
    }
  }

  #visitStatements(statements: readonly AstNode[], parent: Scope | null): void {
    const scope = this.#lexicalScope(statements, parent);
    for (const statement of statements) {
      this.#visit(statement, scope);
    }
  }

  /** Visits a `for` head declaration or target, returning the body's scope. */
  #visitForHead(head: AstNode | null, scope: Scope | null): Scope {
    if (head?.type === 'VariableDeclaration') {
      const headScope = this.#lexicalScope([head], scope);
      this.#visit(head, headScope);
      return headScope;
    }
    const bodyScope: Scope = { names: new Set(), parent: scope };
    if (head) {
      this.#visit(head, bodyScope);
    }

    return bodyScope;
  }

  #visitChildren(
    node: AstNode,
    keys: readonly string[],
    scope: Scope | null,
  ): void {
    for (const key of keys) {
      for (const part of nodes(field(node, key))) {
        this.#visit(part, scope);
      }
    }
  }

  // oxlint-disable-next-line max-lines-per-function
  #visit(node: AstNode, scope: Scope | null): void {
    switch (node.type) {
      case 'Identifier':
        this.#reference(node, scope, false, false);
        return;
      case 'MemberExpression':
        this.#visitChildren(
          node,
          field(node, 'computed') === true
            ? ['object', 'property']
            : ['object'],
          scope,
        );
        return;
      case 'ObjectExpression':
        for (const property of nodes(field(node, 'properties'))) {
          if (property.type === 'SpreadElement') {
            this.#visit(property, scope);
            continue;
          }
          if (field(property, 'computed') === true) {
            this.#visit(child(property, 'key')!, scope);
          }
          const value = child(property, 'value')!;
          if (field(property, 'shorthand') === true) {
            this.#reference(value, scope, true, false);
          } else {
            this.#visit(value, scope);
          }
        }
        return;
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        this.visitFunction(node, scope);
        return;
      case 'AssignmentExpression':
        this.#visitTarget(child(node, 'left')!, scope);
        this.#visit(child(node, 'right')!, scope);
        return;
      case 'UpdateExpression':
        this.#visitTarget(child(node, 'argument')!, scope);
        return;
      case 'BlockStatement':
        this.#visitStatements(nodes(field(node, 'body')), scope);
        return;
      case 'VariableDeclaration':
        if (field(node, 'kind') === 'var') {
          this.#fail('a member declares a var');
        }
        for (const declarator of nodes(field(node, 'declarations'))) {
          this.#visitPattern(child(declarator, 'id')!, scope);
          this.#visitChildren(declarator, ['init'], scope);
        }
        return;
      case 'ForStatement':
        this.#visitChildren(
          node,
          ['test', 'update', 'body'],
          this.#visitForHead(child(node, 'init'), scope),
        );
        return;
      case 'ForInStatement':
      case 'ForOfStatement': {
        const left = child(node, 'left')!;
        let headScope: Scope;
        if (left.type === 'VariableDeclaration') {
          headScope = this.#visitForHead(left, scope);
        } else {
          headScope = { names: new Set(), parent: scope };
          this.#visitTarget(left, scope);
        }
        this.#visitChildren(node, ['right', 'body'], headScope);
        return;
      }
      case 'TryStatement':
        this.#visitChildren(node, ['block', 'handler', 'finalizer'], scope);
        return;
      case 'CatchClause': {
        const names = new Set<string>();
        const param = child(node, 'param');
        const clauseScope: Scope = { names, parent: scope };
        if (param) {
          addPatternNames(param, names, this.#fail);
          this.#visitPattern(param, clauseScope);
        }
        this.#visit(child(node, 'body')!, clauseScope);
        return;
      }
      case 'SwitchStatement': {
        this.#visit(child(node, 'discriminant')!, scope);
        const cases = nodes(field(node, 'cases'));
        const caseScope = this.#lexicalScope(
          cases.flatMap((switchCase) => nodes(field(switchCase, 'consequent'))),
          scope,
        );
        for (const switchCase of cases) {
          this.#visitChildren(switchCase, ['test', 'consequent'], caseScope);
        }
        return;
      }
      default: {
        const keys = CHILDREN[node.type];
        if (!keys) {
          this.#fail(
            `a member uses ${node.type}, which the analysis doesn't model`,
          );
        }
        this.#visitChildren(node, keys, scope);
      }
    }
  }
}

/**
 * Collects the free references of `fn`, a method's function expression, in
 * the order the walk meets them. Calls `fail` on a construct the analysis
 * doesn't model.
 */
export function collectFreeReferences(
  fn: AstNode,
  fail: Fail,
): readonly FreeReference[] {
  const collector = new ReferenceCollector(fail);
  collector.visitFunction(fn, null);

  return collector.references;
}
