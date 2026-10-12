import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const EMPTY = () => ({ couriers: [], sessions: [], shops: [], orders: [] });

/**
 * Minimal JSON store. All reads are served from memory.
 *
 * - With `file`, every mutation is flushed with an atomic rename so a crash never
 *   leaves a half-written file (local / single-server deployments).
 * - With `persist`, every mutation queues an async save of the whole snapshot
 *   (Firebase: a Cloud Storage object). `idle()` resolves once saves have landed,
 *   so the API can answer only after the data is durable.
 *
 * Swap this module for a real database when moving past the pilot.
 */
export function createStore(file, { initial, persist } = {}) {
  let data = EMPTY();
  if (initial) data = { ...EMPTY(), ...initial };
  else if (file && existsSync(file)) data = { ...EMPTY(), ...JSON.parse(readFileSync(file, 'utf8')) };

  let queue = Promise.resolve();
  let dirty = false;

  function flush() {
    if (persist) {
      dirty = true;
      // Coalesce: one save writes the latest snapshot for every mutation queued before it starts.
      queue = queue.then(async () => {
        if (!dirty) return;
        dirty = false;
        await persist(data);
      });
      queue.catch((err) => console.error('store persist failed', err));
    }
    if (!file) return;
    mkdirSync(dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify(data));
    renameSync(tmp, file);
  }

  return {
    get data() {
      return data;
    },
    /** Run a mutation and persist it. */
    write(fn) {
      const result = fn(data);
      flush();
      return result;
    },
    /** Resolves when all queued saves have finished (rejects if the last one failed). */
    idle() {
      return queue;
    },
  };
}
