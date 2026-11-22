import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createTracker } from 'universal-parcel-scraper/node';

const MAX_BODY_BYTES = 4_096;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;
const requests = new Map<string, { count: number; resetAt: number }>();

function limited(ip: string, now = Date.now()): boolean {
  const entry = requests.get(ip);
  if (!entry || entry.resetAt <= now) {
    requests.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: 'Request is too large.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Send a valid JSON request.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return json({ error: 'Send a tracking number.' }, { status: 400 });
  }

  const input = body as { number?: unknown; carrier?: unknown };
  const number = typeof input.number === 'string' ? input.number.trim() : '';
  const carrier = typeof input.carrier === 'string' ? input.carrier.trim().toLowerCase() : '';

  if (number.length < 5 || number.length > 100 || /[\r\n\0]/.test(number)) {
    return json({ error: 'Enter a valid tracking number (5–100 characters).' }, { status: 400 });
  }
  if (carrier && !/^[a-z0-9_-]{1,60}$/.test(carrier)) {
    return json({ error: 'Invalid courier selection.' }, { status: 400 });
  }

  let ip = 'unknown';
  try {
    ip = getClientAddress();
  } catch {
    // Some local preview adapters do not expose a client address.
  }
  if (limited(ip)) {
    return json({ error: 'Too many lookups. Please wait a minute and try again.' }, { status: 429 });
  }

  try {
    const tracker = createTracker();
    const response = await tracker.track({ number, ...(carrier ? { carrier } : {}) });
    const result = response.result;

    return json({
      carrier: response.carrier,
      source: response.source,
      status: result.current_stage ?? null,
      expectedDelivery: result.expected_delivery ?? null,
      serviceName: result.service_name ?? null,
      events: (result.events ?? []).map((event) => ({
        time: event.time ?? null,
        location: event.location ?? null,
        description: event.description ?? null,
        stage: event.stage ?? null
      }))
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch {
    return json({
      error: 'We could not retrieve tracking details for this number. Check the number and courier, or try again later.'
    }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
  }
};
