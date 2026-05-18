# Webhook examples

> Template for documenting webhooks **you receive** (from third parties or other services). For webhooks you **send**, document them in `rest.md` as regular `POST` endpoints.

---

## Incoming webhook: `POST /api/v1/webhooks/payment`

| Field | Value |
|---|---|
| Source | `payments.example.com` |
| Method | `POST` |
| Content-Type | `application/json` |
| Signature header | `X-Webhook-Signature: t=<unix>,v1=<hex>` |
| Replay window | 5 minutes (reject older) |

### Payload

```json
{
  "id": "evt_01H...",
  "type": "payment.succeeded",
  "created_at": "2026-05-18T12:34:56Z",
  "data": {
    "payment_id": "pay_01H...",
    "order_id": "ord_01H...",
    "amount_cents": 12990,
    "currency": "BRL",
    "method": "pix"
  }
}
```

### Signature verification (Node.js example)

```js
const crypto = require('node:crypto');

function verify(rawBody, headerValue, secret) {
  const parts = Object.fromEntries(
    headerValue.split(',').map((kv) => kv.split('='))
  );
  const timestamp = Number(parts.t);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return { ok: false, reason: 'stale' };
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${parts.t}.${rawBody}`)
    .digest('hex');
  const ok = crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(parts.v1, 'hex'),
  );
  return ok ? { ok: true } : { ok: false, reason: 'mismatch' };
}
```

### Expected response

| Status | Meaning |
|---|---|
| `200 OK` (empty body) | webhook stored / processed; sender will not retry |
| `2xx` | sender will not retry |
| `4xx` (except 408/429) | permanent failure; sender will NOT retry — only return this for genuinely invalid payloads |
| `408 Request Timeout` | sender retries with exponential backoff |
| `429 Too Many Requests` | sender retries respecting `Retry-After` |
| `5xx` | sender retries up to 24h with exponential backoff |

### Idempotency

`event.id` is unique per webhook. Persist it in a `processed_events` table with a unique constraint before doing anything else — duplicates are common (sender retries crossing your 200 OK in flight).

```sql
INSERT INTO processed_events (event_id, source, received_at)
VALUES ($1, 'payments', NOW())
ON CONFLICT (event_id) DO NOTHING
RETURNING event_id;
```

If `RETURNING` is empty, the event was already processed — return `200 OK` and skip side effects.

### Event types catalog

| Event type | Trigger | Required action |
|---|---|---|
| `payment.succeeded` | Payment captured | mark order as `paid`, queue fulfillment |
| `payment.failed` | Capture failed | mark order as `payment_failed`, notify customer |
| `payment.refunded` | Refund issued | mark order as `refunded`, reverse fulfillment if shipped |
| `payment.disputed` | Chargeback opened | freeze account, notify operations |
