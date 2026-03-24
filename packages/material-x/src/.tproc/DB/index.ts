import { DB } from './DB.ts';

const db: DB = await DB.load();

export default db;
