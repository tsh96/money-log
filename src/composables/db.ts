import Dexie, { type EntityTable } from "dexie";
import { Transaction } from "./transaction";

export const db = new Dexie('money-log') as Dexie & {
  transactions: EntityTable<
    Transaction,
    'id' // primary key "id" (for the typings only)
  >;
};

db.version(1).stores({
  transactions: '++id, type, amount, description, date, receipt'
});