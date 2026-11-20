import type { MaterialTheme } from '../src/MaterialTheme.ts';
import type {
  StoredContext,
  StoredSet,
  StoredToken,
  StoredValue,
} from '../src/store/schema.ts';
import { Store } from '../src/store/Store.ts';

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

export const createValue = (
  overrides: Partial<StoredValue> = {},
): StoredValue => ({ ...overrides });

export const createToken = (
  overrides: Partial<StoredToken> = {},
): StoredToken => ({
  tokenName: 'md.comp.test.token',
  displayName: 'Token',
  tokenValueType: 'number',
  values: [],
  ...overrides,
});

export const createTokenSet = (
  overrides: Partial<StoredSet> = {},
): StoredSet => ({
  tokenSetName: 'md.comp.test',
  displayName: 'Test',
  description: '',
  tokens: [],
  ...overrides,
});

export const createContext = (): StoredContext => ({
  contextTagGroups: [
    {
      contextTagGroupName: 'motion.scheme',
      displayName: 'Motion scheme',
      specificity: 1,
      defaultTag: 'standard',
      tags: [
        { tagName: 'standard', displayName: 'Standard', tagOrder: 0 },
        { tagName: 'expressive', displayName: 'Expressive', tagOrder: 1 },
      ],
    },
  ],
});

let store = new Store({ context: createContext(), sets: [] });

/** Replaces the store that `src/store/index.ts` gives the modules under test. */
export const useStore = (...sets: readonly StoredSet[]): Store => {
  store = new Store({ context: createContext(), sets });
  return store;
};

/** Stands in for `src/store/index.ts`; its default export is read per use. */
export const storeModule: { readonly default: Store } = {
  get default(): Store {
    return store;
  },
};

export const themeModule: { readonly default: MaterialTheme } = {
  default: createTheme(),
};

export const resetStore = (): void => {
  useStore();
};
