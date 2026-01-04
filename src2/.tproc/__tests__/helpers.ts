import { vi, type MockInstance } from 'vitest';
import type { ExtendedValue, MaybeOrphanTokenSet } from '../DB/DB.ts';
import type { MaterialTheme } from '../MaterialTheme.ts';
import type {
  ContextTag,
  Token,
  TokenSet,
  TokenSystem,
  Value,
} from '../TokenTable.ts';

export const createTheme = (): MaterialTheme => ({
  description: 'test',
  seed: 'test',
  coreColors: {},
  extendedColors: [],
  schemes: {
    light: { primary: '#ff0000' },
    'light-medium-contrast': {},
    'light-high-contrast': {},
    dark: {},
    'dark-medium-contrast': {},
    'dark-high-contrast': {},
  },
  palettes: {
    primary: {},
    secondary: {},
    tertiary: {},
    neutral: {},
    'neutral-variant': {},
  },
});

export const createTokenSet = (
  overrides: Partial<TokenSet> = {},
): TokenSet => ({
  name: 'md.comp.test',
  revisionId: '1',
  revisionCreateTime: '',
  state: 'active',
  tokenSetName: 'md.comp.test',
  displayName: 'Test',
  description: '',
  custom: { token_class: 'test' },
  tokenSetNameSuffix: 'test',
  tokenType: 'number',
  order: 0,
  createTime: '',
  ...overrides,
});

export const createToken = (overrides: Partial<Token> = {}): Token => ({
  name: 'md.test.token',
  revisionId: '1',
  revisionCreateTime: '',
  state: 'active',
  tokenName: 'md.test.token',
  displayName: 'Token',
  displayGroup: 'Group',
  orderInDisplayGroup: 5,
  tokenNameSuffix: 'token',
  tokenValueType: 'number',
  createTime: '',
  ...overrides,
});

export const createValue = (overrides: Partial<Value> = {}): Value => ({
  name: 'md.test.value',
  revisionId: '1',
  revisionCreateTime: '',
  state: 'active',
  contextTags: [],
  specificityScore: '0',
  createTime: '',
  ...overrides,
});

export const createTag = (overrides: Partial<ContextTag> = {}): ContextTag => ({
  name: 'expressive-tag',
  revisionId: '1',
  revisionCreateTime: '',
  state: 'active',
  displayName: 'Expressive',
  tagName: 'expressive',
  tagOrder: 0,
  createTime: '',
  ...overrides,
});

export const createSystem = (
  overrides: Partial<TokenSystem> = {},
): TokenSystem => ({
  tokenSets: [],
  tokens: [],
  values: [],
  contextualReferenceTrees: {},
  contextTagGroups: [],
  tags: [],
  ...overrides,
});

type MockDBState = {
  tokenSets: TokenSet[];
  tokens: Token[];
  values: Value[];
  theme: MaterialTheme;
};

type MockFn<TArgs extends readonly unknown[], TResult> = MockInstance<
  (...args: TArgs) => TResult
>;

type MockDB = {
  readonly tokenSets: IteratorObject<TokenSet>;
  readonly tokens: IteratorObject<Token>;
  readonly values: IteratorObject<Value>;
  readonly theme: MaterialTheme;
  getToken: MockFn<[string], Token | undefined>;
  getValue: MockFn<[Token], ExtendedValue | undefined>;
  getSet: MockFn<[Token], MaybeOrphanTokenSet>;
  isTokenDeprecated: MockFn<[Token], boolean>;
};

export const state: MockDBState = {
  tokenSets: [],
  tokens: [],
  values: [],
  theme: createTheme(),
};

const getTokenImpl = (name: string): Token | undefined =>
  state.tokens.find((token) => token.tokenName === name || token.name === name);

export const mockDB: MockDB = {
  get tokenSets(): IteratorObject<TokenSet> {
    return Iterator.from(state.tokenSets);
  },
  get tokens(): IteratorObject<Token> {
    return Iterator.from(state.tokens);
  },
  get values(): IteratorObject<Value> {
    return Iterator.from(state.values);
  },
  get theme(): MaterialTheme {
    return state.theme;
  },
  getToken: vi.fn<(name: string) => Token | undefined>(getTokenImpl),
  getValue: vi.fn<(token: Token) => ExtendedValue | undefined>(),
  getSet: vi.fn<(token: Token) => MaybeOrphanTokenSet>(),
  isTokenDeprecated: vi.fn<(token: Token) => boolean>(),
};

export const resetMockDB = (overrides: Partial<MockDBState> = {}): void => {
  state.tokenSets = [];
  state.tokens = [];
  state.values = [];
  state.theme = createTheme();
  Object.assign(state, overrides);

  mockDB.getToken.mockReset().mockImplementation(getTokenImpl);
  mockDB.getValue.mockReset();
  mockDB.getSet.mockReset();
  mockDB.isTokenDeprecated.mockReset();
};
