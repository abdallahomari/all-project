import express from 'express';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { optimizeRoute, resolveMapsLink } from './google.js';
import {
  ACTIVE_STATUSES,
  HttpError,
  STATUSES,
  normalizeJordanPhone,
  requireFils,
  requireLocation,
  requireString,
} from './validate.js';

const token = () => randomBytes(24).toString('base64url');

function hashPin(pin, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`;
}

function verifyPin(pin, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = scryptSync(pin, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/** Calendar day in Jordan, e.g. "2026-10-12". */
const ammanDay = (date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(date),
  );

const publicCourier = ({ id, name, phone }) => ({ id, name, phone });

/** Simple fixed-window limiter, keyed per client, for login and public endpoints. */
function rateLimit({ windowMs, max, key }) {
  const hits = new Map();
  return (req, _res, next) => {
    const k = key(req);
    const now = Date.now();
    const entry = hits.get(k);
    if (!entry || entry.reset < now) {
      hits.set(k, { count: 1, reset: now + windowMs });
      return next();
    }
    if (++entry.count > max) return next(new HttpError(429, 'too_many_requests'));
    next();
  };
}

export function createApp({ store, config = {}, fetchImpl = fetch }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.use((_req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  // When the store saves asynchronously (Firebase), answer writes only once the save has
  // landed — a serverless instance may be frozen right after the response is sent.
  if (store.idle) {
    app.use((req, res, next) => {
      if (req.method === 'GET' || req.method === 'HEAD') return next();
      const end = res.end.bind(res);
      res.end = (...args) => {
        store.idle().then(
          () => end(...args),
          (err) => {
            console.error('save failed', err);
            if (!res.headersSent) {
              res.status(503).set('Content-Type', 'application/json');
              res.removeHeader('Content-Length');
            }
            end(JSON.stringify({ error: 'save_failed' }));
          },
        );
        return res;
      };
      next();
    });
  }

  const api = express.Router();

  // ---------- config ----------
  api.get('/config', (_req, res) => {
    res.json({
      mapsApiKey: config.mapsBrowserKey ?? '',
      mapId: config.mapId || 'DEMO_MAP_ID',
      serverRouting: Boolean(config.mapsServerKey),
    });
  });

  // ---------- auth ----------
  const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, key: (req) => `auth:${req.ip}` });

  const startSession = (courier) =>
    store.write((db) => {
      const session = { token: token(), courierId: courier.id, createdAt: new Date().toISOString() };
      db.sessions.push(session);
      return { token: session.token, courier: publicCourier(courier) };
    });

  const readPin = (pin) => {
    const value = typeof pin === 'string' ? pin.trim() : '';
    if (!/^\d{4,6}$/.test(value)) throw new HttpError(400, 'invalid_pin');
    return value;
  };

  api.post('/auth/register', authLimiter, (req, res) => {
    const name = requireString(req.body?.name, 'name', { max: 80 });
    const phone = normalizeJordanPhone(req.body?.phone);
    if (!phone) throw new HttpError(400, 'invalid_phone');
    const pin = readPin(req.body?.pin);
    if (store.data.couriers.some((c) => c.phone === phone)) throw new HttpError(409, 'phone_taken');
    const courier = store.write((db) => {
      const c = { id: randomUUID(), name, phone, pinHash: hashPin(pin), createdAt: new Date().toISOString() };
      db.couriers.push(c);
      return c;
    });
    res.status(201).json(startSession(courier));
  });

  api.post('/auth/login', authLimiter, (req, res) => {
    const phone = normalizeJordanPhone(req.body?.phone);
    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    const courier = phone && store.data.couriers.find((c) => c.phone === phone);
    if (!courier || !verifyPin(pin, courier.pinHash)) throw new HttpError(401, 'wrong_credentials');
    res.json(startSession(courier));
  });

  // ---------- public customer location (no auth) ----------
  const publicLimiter = rateLimit({ windowMs: 60_000, max: 30, key: (req) => `pub:${req.ip}` });
  const findByToken = (t) => {
    const order = typeof t === 'string' && t.length >= 16 && store.data.orders.find((o) => o.locationToken === t);
    if (!order) throw new HttpError(404, 'link_not_found');
    return order;
  };

  api.get('/public/location/:token', publicLimiter, (req, res) => {
    const order = findByToken(req.params.token);
    const shop = store.data.shops.find((s) => s.id === order.shopId);
    res.json({
      shopName: shop?.name ?? '',
      hasLocation: Boolean(order.location),
      closed: !ACTIVE_STATUSES.includes(order.status),
    });
  });

  api.post('/public/location/:token', publicLimiter, (req, res) => {
    const order = findByToken(req.params.token);
    if (!ACTIVE_STATUSES.includes(order.status)) throw new HttpError(410, 'order_closed');
    const location = requireLocation(req.body, { source: 'customer' });
    store.write(() => {
      order.location = location;
      order.updatedAt = new Date().toISOString();
    });
    res.json({ ok: true });
  });

  // ---------- everything below requires a courier session ----------
  const authed = express.Router();
  authed.use((req, _res, next) => {
    const header = req.get('authorization') ?? '';
    const t = header.startsWith('Bearer ') ? header.slice(7) : '';
    const session = t && store.data.sessions.find((s) => s.token === t);
    const courier = session && store.data.couriers.find((c) => c.id === session.courierId);
    if (!courier) return next(new HttpError(401, 'unauthorized'));
    req.courier = courier;
    next();
  });

  authed.get('/me', (req, res) => res.json(publicCourier(req.courier)));

  authed.post('/auth/logout', (req, res) => {
    const t = req.get('authorization').slice(7);
    store.write((db) => {
      db.sessions = db.sessions.filter((s) => s.token !== t);
    });
    res.status(204).end();
  });

  // ---------- shops ----------
  const ownShop = (req, id) => {
    const shop = store.data.shops.find((s) => s.id === id && s.courierId === req.courier.id);
    if (!shop) throw new HttpError(404, 'shop_not_found');
    return shop;
  };
  const shopPhone = (raw) => {
    if (raw == null || raw === '') return undefined;
    const phone = normalizeJordanPhone(raw);
    if (!phone) throw new HttpError(400, 'invalid_phone');
    return phone;
  };

  authed.get('/shops', (req, res) => {
    res.json(store.data.shops.filter((s) => s.courierId === req.courier.id));
  });

  authed.post('/shops', (req, res) => {
    const name = requireString(req.body?.name, 'name', { max: 80 });
    const phone = shopPhone(req.body?.phone);
    const shop = store.write((db) => {
      const s = { id: randomUUID(), courierId: req.courier.id, name, phone, createdAt: new Date().toISOString() };
      db.shops.push(s);
      return s;
    });
    res.status(201).json(shop);
  });

  authed.patch('/shops/:id', (req, res) => {
    const shop = ownShop(req, req.params.id);
    const b = req.body ?? {};
    const patch = {};
    if ('name' in b) patch.name = requireString(b.name, 'name', { max: 80 });
    if ('phone' in b) patch.phone = shopPhone(b.phone);
    store.write(() => {
      Object.assign(shop, patch);
      if (shop.phone === undefined) delete shop.phone;
    });
    res.json(shop);
  });

  authed.delete('/shops/:id', (req, res) => {
    const shop = ownShop(req, req.params.id);
    if (store.data.orders.some((o) => o.shopId === shop.id)) throw new HttpError(409, 'shop_has_orders');
    store.write((db) => {
      db.shops = db.shops.filter((s) => s.id !== shop.id);
    });
    res.status(204).end();
  });

  // ---------- orders ----------
  const ownOrder = (req, id) => {
    const order = store.data.orders.find((o) => o.id === id && o.courierId === req.courier.id);
    if (!order) throw new HttpError(404, 'order_not_found');
    return order;
  };
  const customerPhone = (raw) => {
    if (raw == null || raw === '') return undefined;
    const phone = normalizeJordanPhone(raw);
    if (!phone) throw new HttpError(400, 'invalid_customer_phone');
    return phone;
  };

  authed.get('/orders', (req, res) => {
    const scope = req.query.scope ?? 'today';
    const today = ammanDay(Date.now());
    const mine = store.data.orders.filter((o) => o.courierId === req.courier.id);
    const result = mine.filter((o) => {
      if (scope === 'all') return true;
      if (ACTIVE_STATUSES.includes(o.status)) return true;
      return scope === 'today' && o.closedAt && ammanDay(o.closedAt) === today;
    });
    res.json(result.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  });

  authed.post('/orders', (req, res) => {
    const b = req.body ?? {};
    ownShop(req, b.shopId);
    const now = new Date().toISOString();
    const order = {
      id: randomUUID(),
      courierId: req.courier.id,
      shopId: b.shopId,
      customerName: requireString(b.customerName, 'customerName', { max: 80 }),
      customerPhone: customerPhone(b.customerPhone),
      amountFils: requireFils(b.amountFils ?? 0, 'amountFils'),
      addressNote: requireString(b.addressNote, 'addressNote', { max: 500, optional: true }),
      location: requireLocation(b.location, { optional: true }),
      locationToken: token(),
      status: b.status === 'picked_up' ? 'picked_up' : 'pending_pickup',
      createdAt: now,
      updatedAt: now,
    };
    store.write((db) => db.orders.push(order));
    res.status(201).json(order);
  });

  authed.patch('/orders/:id', (req, res) => {
    const order = ownOrder(req, req.params.id);
    const b = req.body ?? {};
    const patch = {};
    if ('shopId' in b) patch.shopId = ownShop(req, b.shopId).id;
    if ('customerName' in b) patch.customerName = requireString(b.customerName, 'customerName', { max: 80 });
    if ('customerPhone' in b) patch.customerPhone = customerPhone(b.customerPhone);
    if ('amountFils' in b) patch.amountFils = requireFils(b.amountFils, 'amountFils');
    if ('addressNote' in b) patch.addressNote = requireString(b.addressNote, 'addressNote', { max: 500, optional: true });
    if ('location' in b) patch.location = b.location === null ? undefined : requireLocation(b.location);
    if ('status' in b) {
      if (!STATUSES.includes(b.status)) throw new HttpError(400, 'invalid_status');
      patch.status = b.status;
      patch.statusReason = requireString(b.statusReason, 'statusReason', { max: 80, optional: true });
      patch.statusNote = requireString(b.statusNote, 'statusNote', { max: 500, optional: true });
      patch.postponedTo = requireString(b.postponedTo, 'postponedTo', { max: 10, optional: true });
      const active = ACTIVE_STATUSES.includes(b.status);
      patch.closedAt = active ? undefined : new Date().toISOString();
      if (b.status === 'delivered' || b.status === 'partial') {
        patch.collectedFils = requireFils(b.collectedFils ?? order.amountFils, 'collectedFils');
      } else {
        patch.collectedFils = undefined;
      }
    }
    store.write(() => {
      Object.assign(order, patch, { updatedAt: new Date().toISOString() });
      for (const key of Object.keys(order)) if (order[key] === undefined) delete order[key];
    });
    res.json(order);
  });

  authed.delete('/orders/:id', (req, res) => {
    const order = ownOrder(req, req.params.id);
    store.write((db) => {
      db.orders = db.orders.filter((o) => o.id !== order.id);
    });
    res.status(204).end();
  });

  // ---------- maps helpers ----------
  authed.post('/route/optimize', async (req, res) => {
    const origin = req.body?.origin;
    const stops = Array.isArray(req.body?.stops) ? req.body.stops : null;
    const point = (p) => p && typeof p.lat === 'number' && typeof p.lng === 'number';
    if (!point(origin) || !stops || !stops.every((s) => point(s) && typeof s.id === 'string')) {
      throw new HttpError(400, 'invalid_route_request');
    }
    const result = await optimizeRoute({
      apiKey: config.mapsServerKey,
      origin,
      stops,
      language: req.body?.language,
      fetchImpl,
    });
    res.json(result);
  });

  authed.post('/maps/resolve', async (req, res) => {
    const url = requireString(req.body?.url, 'url', { max: 2000 });
    res.json(await resolveMapsLink(url, { fetchImpl }));
  });

  api.use(authed);
  app.use('/api', api);
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'not_found')));

  // ---------- built Angular app (production) ----------
  if (config.staticDir && existsSync(config.staticDir)) {
    app.use(express.static(config.staticDir, { index: false, maxAge: '1h' }));
    app.get('/{*splat}', (_req, res) => res.sendFile(join(config.staticDir, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.code });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid_json' });
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  });

  return app;
}
