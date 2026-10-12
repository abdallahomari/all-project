// Firebase entry point: the Express API as an HTTPS Cloud Function (2nd gen).
// Firebase Hosting serves the Angular app and rewrites /api/** here (see firebase.json).
import { initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { onRequest } from 'firebase-functions/v2/https';
import { createApp } from './app.js';
import { createStore } from './store.js';

initializeApp();

// The whole pilot dataset lives in one JSON object in the project's default Storage bucket.
// maxInstances: 1 keeps a single writer, so the in-memory store stays authoritative.
const DB_OBJECT = 'wasel/db.json';

async function buildApp() {
  const file = getStorage().bucket().file(DB_OBJECT);
  const [exists] = await file.exists();
  const initial = exists ? JSON.parse((await file.download())[0].toString('utf8')) : undefined;
  const store = createStore(null, {
    initial,
    persist: (data) => file.save(JSON.stringify(data), { contentType: 'application/json', resumable: false }),
  });
  const app = createApp({
    store,
    config: {
      mapsBrowserKey: process.env.GOOGLE_MAPS_BROWSER_KEY ?? '',
      mapId: process.env.GOOGLE_MAPS_MAP_ID ?? '',
      mapsServerKey: process.env.GOOGLE_MAPS_SERVER_KEY ?? '',
    },
  });
  app.set('trust proxy', true);
  return app;
}

let appPromise;

export const api = onRequest(
  { region: 'europe-west1', maxInstances: 1, concurrency: 80, memory: '256MiB', timeoutSeconds: 30 },
  async (req, res) => {
    appPromise ??= buildApp().catch((err) => {
      appPromise = undefined;
      throw err;
    });
    (await appPromise)(req, res);
  },
);
