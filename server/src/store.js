import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const EMPTY = () => ({ couriers: [], sessions: [], shops: [], orders: [] });

/**
 * Minimal JSON-file store. All reads are served from memory; every mutation is
 * flushed with an atomic rename so a crash never leaves a half-written file.
 * Swap this module for a Postgres repository when moving past the pilot.
 */
export function createStore(file) {
  let data = EMPTY();
  if (file && existsSync(file)) {
    data = { ...EMPTY(), ...JSON.parse(readFileSync(file, 'utf8')) };
  }

  function flush() {
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
  };
}
