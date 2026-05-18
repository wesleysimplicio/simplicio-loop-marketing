# REST examples

> Template for documenting REST endpoints in a way an agent can copy/paste and adapt.

---

## Example: `POST /api/v1/orders` — create order

| Field | Value |
|---|---|
| Method | `POST` |
| Path | `/api/v1/orders` |
| Auth | Bearer JWT (`scope: orders:write`) |
| Idempotency | header `Idempotency-Key: <uuid>` required |
| Rate limit | 60 req/min per token |

### Request

```bash
curl -X POST https://api.example.com/api/v1/orders \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 4b6f7d6a-1234-5678-90ab-c0ffee000001" \
  -d '{
    "customer_id": "cus_01H...",
    "items": [
      { "sku": "SKU-001", "quantity": 2 },
      { "sku": "SKU-002", "quantity": 1 }
    ],
    "shipping_address": {
      "country": "BR",
      "postal_code": "01001-000"
    }
  }'
```

### Successful response (`201 Created`)

```json
{
  "id": "ord_01H...",
  "status": "pending_payment",
  "total_amount_cents": 12990,
  "currency": "BRL",
  "items": [
    { "sku": "SKU-001", "quantity": 2, "unit_price_cents": 4990 },
    { "sku": "SKU-002", "quantity": 1, "unit_price_cents": 3010 }
  ],
  "created_at": "2026-05-18T12:34:56Z"
}
```

### Error responses

| Status | Body shape | When it happens |
|---|---|---|
| `400 Bad Request` | `{"error": "validation_failed", "fields": [...]}` | required field missing, invalid SKU, malformed address |
| `401 Unauthorized` | `{"error": "invalid_token"}` | missing/expired JWT |
| `403 Forbidden` | `{"error": "insufficient_scope"}` | token lacks `orders:write` |
| `409 Conflict` | `{"error": "duplicate_idempotency_key"}` | same `Idempotency-Key` already used with a different payload |
| `422 Unprocessable Entity` | `{"error": "out_of_stock", "sku": "SKU-001"}` | inventory insufficient |
| `429 Too Many Requests` | `{"error": "rate_limited", "retry_after_seconds": 30}` | over 60 req/min |

### Notes for agents

- The endpoint is idempotent **only** when `Idempotency-Key` is provided. Generate one client-side and reuse on retry.
- `total_amount_cents` is always an integer in the smallest currency unit; never assume floats.
- Errors return `application/problem+json` per RFC 9457 — fields beyond `error` may be added without notice.

---

## Pagination convention

All list endpoints (`GET /api/v1/<resource>?cursor=&limit=`) follow:

```json
{
  "data": [ /* items */ ],
  "page_info": {
    "next_cursor": "eyJpZCI6Im9yZF8wMUguLi4ifQ",
    "has_next": true,
    "limit": 50
  }
}
```

- Iterate by passing `?cursor=<next_cursor>` until `has_next` is `false`.
- `limit` accepts 1-100, default 50.
- Cursors are opaque; never parse the base64 content.

---

## Versioning

- Major version goes in the URL: `/api/v1/...`, `/api/v2/...`.
- Backwards-compatible additions: no version bump (new optional field, new endpoint).
- Backwards-incompatible changes: bump to `v2`, keep `v1` alive for at least 6 months with `Sunset` header announcing the EOL.
