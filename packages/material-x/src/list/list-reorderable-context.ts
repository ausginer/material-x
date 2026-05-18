import { createContext, type Context } from 'ydin/controllers/useContext.js';
import type { ReorderableContextData } from 'ydin/traits/reorderable.js';

export const LIST_REORDERABLE_CTX: Context<ReorderableContextData> =
  createContext<ReorderableContextData>();
