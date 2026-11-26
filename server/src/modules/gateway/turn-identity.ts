import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';

const turns = new AsyncLocalStorage<string>();

export function turnKey(tenant: string, user: string, client: string): string {
  return createHash('sha256').update(JSON.stringify([tenant, user, client])).digest('hex');
}

export function inTurn<T>(key: string | undefined, work: () => Promise<T>): Promise<T> {
  return key ? turns.run(key, work) : work();
}

export function currentTurn(): string | undefined { return turns.getStore(); }

export function turnId(prefix: string, key = currentTurn()): string | undefined {
  return key ? `${prefix}_${key}` : undefined;
}
