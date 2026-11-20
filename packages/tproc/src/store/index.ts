import { root } from '../utils.ts';
import { loadStore, type Store } from './Store.ts';

const store: Store = await loadStore(new URL('tokens/', root));

export default store;
