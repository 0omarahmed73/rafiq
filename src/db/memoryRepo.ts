import type { Repo } from './repo';
import type { TableName } from './schema';
import { createRepo, KEY_FIELD, type Store } from './repoCore';

type Rows = Map<string | number, unknown>;

export function createMemoryStore(): Store {
  const data = new Map<TableName, Rows>();
  const rows = (table: TableName): Rows => {
    let m = data.get(table);
    if (!m) {
      m = new Map();
      data.set(table, m);
    }
    return m;
  };

  return {
    async all<T>(table: TableName) {
      return [...rows(table).values()].map((r) => structuredClone(r)) as T[];
    },
    async get<T>(table: TableName, key: string | number) {
      const found = rows(table).get(key);
      return found === undefined ? undefined : (structuredClone(found) as T);
    },
    async put(table, row) {
      const key = (row as Record<string, string | number>)[KEY_FIELD[table]];
      rows(table).set(key, structuredClone(row));
    },
    async remove(table, key) {
      rows(table).delete(key);
    },
    async clear(table) {
      rows(table).clear();
    },
    async where<T>(table: TableName, field: string, value: string | number) {
      return [...rows(table).values()]
        .filter((r) => (r as Record<string, unknown>)[field] === value)
        .map((r) => structuredClone(r)) as T[];
    },
    async keysWhere(table, field, value) {
      return [...rows(table).entries()]
        .filter(([, r]) => (r as Record<string, unknown>)[field] === value)
        .map(([key]) => key);
    },
    async countWhere(table, field, value) {
      return [...rows(table).values()].filter((r) => (r as Record<string, unknown>)[field] === value).length;
    },
    async transaction<T>(fn: () => Promise<T>) {
      const snapshot = new Map([...data].map(([name, m]) => [name, new Map(m)] as const));
      try {
        return await fn();
      } catch (error) {
        data.clear();
        snapshot.forEach((m, name) => data.set(name, m));
        throw error;
      }
    },
  };
}

export function createMemoryRepo(): Repo {
  return createRepo(createMemoryStore());
}
