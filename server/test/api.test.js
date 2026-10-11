import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createStore } from '../src/store.js';
import { coordsFromMapsUrl, optimizeRoute, resolveMapsLink } from '../src/google.js';
import { normalizeJordanPhone } from '../src/validate.js';

async function startServer(config = {}, fetchImpl) {
  const app = createApp({ store: createStore(null), config, fetchImpl });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, path, body, token) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  return { call, close: () => server.close() };
}

test('normalizes Jordanian mobile numbers including Arabic-Indic digits', () => {
  assert.equal(normalizeJordanPhone('0791234567'), '+962791234567');
  assert.equal(normalizeJordanPhone('+962 79 123 4567'), '+962791234567');
  assert.equal(normalizeJordanPhone('00962771234567'), '+962771234567');
  assert.equal(normalizeJordanPhone('٠٧٨١٢٣٤٥٦٧'), '+962781234567');
  assert.equal(normalizeJordanPhone('0761234567'), null);
  assert.equal(normalizeJordanPhone('12345'), null);
});

test('full courier flow: register, shop, order, customer location, delivery', async () => {
  const { call, close } = await startServer();
  try {
    const reg = await call('POST', '/auth/register', { name: 'Omar', phone: '0791234567', pin: '1234' });
    assert.equal(reg.status, 201);
    const t = reg.body.token;
    assert.equal(reg.body.courier.phone, '+962791234567');
    assert.equal(reg.body.courier.pinHash, undefined);

    assert.equal((await call('POST', '/auth/register', { name: 'X', phone: '0791234567', pin: '1234' })).status, 409);
    assert.equal((await call('POST', '/auth/login', { phone: '0791234567', pin: '0000' })).status, 401);
    assert.equal((await call('POST', '/auth/login', { phone: '0791234567', pin: '1234' })).status, 200);
    assert.equal((await call('GET', '/orders')).status, 401);

    const shop = await call('POST', '/shops', { name: 'Shoe Corner', phone: '0781112223' }, t);
    assert.equal(shop.status, 201);

    const order = await call(
      'POST',
      '/orders',
      { shopId: shop.body.id, customerName: 'Lina', customerPhone: '0799999999', amountFils: 15500 },
      t,
    );
    assert.equal(order.status, 201);
    assert.equal(order.body.location, undefined);
    const linkToken = order.body.locationToken;
    assert.ok(linkToken.length >= 24);

    // Public page reveals the shop name only.
    const pub = await call('GET', `/public/location/${linkToken}`);
    assert.deepEqual(pub.body, { shopName: 'Shoe Corner', hasLocation: false, closed: false });
    assert.equal((await call('GET', '/public/location/not-a-real-token-123')).status, 404);

    // Outside Jordan is rejected, inside is accepted.
    assert.equal((await call('POST', `/public/location/${linkToken}`, { lat: 48.85, lng: 2.35 })).status, 400);
    assert.equal((await call('POST', `/public/location/${linkToken}`, { lat: 31.9539, lng: 35.9106, accuracy: 12 })).status, 200);

    const list = await call('GET', '/orders?scope=active', undefined, t);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].location.source, 'customer');

    const done = await call('PATCH', `/orders/${order.body.id}`, { status: 'delivered' }, t);
    assert.equal(done.body.collectedFils, 15500);
    assert.ok(done.body.closedAt);

    assert.equal((await call('GET', '/orders?scope=active', undefined, t)).body.length, 0);
    assert.equal((await call('GET', '/orders?scope=today', undefined, t)).body.length, 1);
    assert.equal((await call('POST', `/public/location/${linkToken}`, { lat: 31.95, lng: 35.91 })).status, 410);

    // Reopening clears closure and cash.
    const reopened = await call('PATCH', `/orders/${order.body.id}`, { status: 'picked_up' }, t);
    assert.equal(reopened.body.closedAt, undefined);
    assert.equal(reopened.body.collectedFils, undefined);

    // Another courier cannot see or touch it.
    const other = await call('POST', '/auth/register', { name: 'Sami', phone: '0771234567', pin: '9876' });
    assert.equal((await call('GET', '/orders', undefined, other.body.token)).body.length, 0);
    assert.equal((await call('PATCH', `/orders/${order.body.id}`, { status: 'refused' }, other.body.token)).status, 404);

    assert.equal((await call('DELETE', `/shops/${shop.body.id}`, undefined, t)).status, 409);
  } finally {
    close();
  }
});

test('route optimisation returns 501 without a server key', async () => {
  const { call, close } = await startServer();
  try {
    const { body } = await call('POST', '/auth/register', { name: 'A', phone: '0791111111', pin: '1111' });
    const res = await call(
      'POST',
      '/route/optimize',
      { origin: { lat: 31.95, lng: 35.9 }, stops: [{ id: 'a', lat: 31.96, lng: 35.91 }] },
      body.token,
    );
    assert.equal(res.status, 501);
  } finally {
    close();
  }
});

test('optimizeRoute maps the optimized intermediate order back to stop ids', async () => {
  let sent;
  const fakeFetch = async (_url, init) => {
    sent = JSON.parse(init.body);
    return new Response(
      JSON.stringify({
        routes: [{ optimizedIntermediateWaypointIndex: [1, 0], distanceMeters: 5400, duration: '900s', polyline: { encodedPolyline: 'abc' } }],
      }),
      { status: 200 },
    );
  };
  const result = await optimizeRoute({
    apiKey: 'k',
    origin: { lat: 31.95, lng: 35.9 },
    stops: [
      { id: 'a', lat: 31.96, lng: 35.91 },
      { id: 'b', lat: 31.97, lng: 35.92 },
      { id: 'c', lat: 31.98, lng: 35.93 },
    ],
    fetchImpl: fakeFetch,
  });
  assert.deepEqual(result.order, ['b', 'a', 'c']);
  assert.equal(result.durationSeconds, 900);
  assert.equal(sent.optimizeWaypointOrder, true);
  assert.equal(sent.intermediates.length, 2);
  assert.equal(sent.regionCode, 'JO');
});

test('parses coordinates from common Google Maps URL shapes', () => {
  assert.deepEqual(coordsFromMapsUrl('https://maps.google.com/?q=31.9539,35.9106'), { lat: 31.9539, lng: 35.9106 });
  assert.deepEqual(
    coordsFromMapsUrl('https://www.google.com/maps/place/X/@31.95,35.91,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d31.9561!4d35.9123'),
    { lat: 31.9561, lng: 35.9123 },
  );
  assert.deepEqual(coordsFromMapsUrl('https://www.google.com/maps/search/31.9,+35.8?entry=tts'), { lat: 31.9, lng: 35.8 });
  assert.equal(coordsFromMapsUrl('https://www.google.com/maps'), null);
});

test('resolveMapsLink follows redirects but refuses non-Google hosts', async () => {
  const fakeFetch = async (url) => {
    assert.match(url, /maps\.app\.goo\.gl/);
    return new Response(null, { status: 302, headers: { location: 'https://www.google.com/maps?q=32.0,35.85' } });
  };
  assert.deepEqual(await resolveMapsLink('https://maps.app.goo.gl/abc123', { fetchImpl: fakeFetch }), { lat: 32, lng: 35.85 });
  await assert.rejects(resolveMapsLink('https://evil.example.com/x', { fetchImpl: fakeFetch }), /not_a_maps_link/);
  await assert.rejects(resolveMapsLink('http://169.254.169.254/latest', { fetchImpl: fakeFetch }), /not_a_maps_link/);
});
