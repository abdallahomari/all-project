import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createApp } from './app.js';
import { createStore } from './store.js';

const root = fileURLToPath(new URL('..', import.meta.url));

const config = {
  port: Number(process.env.PORT ?? 3000),
  dataFile: process.env.DATA_FILE ?? resolve(root, 'data/db.json'),
  staticDir: process.env.STATIC_DIR ?? resolve(root, '../web/dist/web/browser'),
  // Browser key: restrict it to your domain (HTTP referrer) and to the Maps JavaScript API.
  mapsBrowserKey: process.env.GOOGLE_MAPS_BROWSER_KEY ?? '',
  mapId: process.env.GOOGLE_MAPS_MAP_ID ?? '',
  // Server key: restrict it to the Routes API and to your server's IP.
  mapsServerKey: process.env.GOOGLE_MAPS_SERVER_KEY ?? '',
};

const app = createApp({ store: createStore(config.dataFile), config });
app.set('trust proxy', 'loopback');
app.listen(config.port, () => {
  console.log(`Wasel API on http://localhost:${config.port}`);
  if (!config.mapsBrowserKey) console.log('GOOGLE_MAPS_BROWSER_KEY not set: the map is hidden, the list still works.');
  if (!config.mapsServerKey) console.log('GOOGLE_MAPS_SERVER_KEY not set: route ordering uses the local optimiser only.');
});
