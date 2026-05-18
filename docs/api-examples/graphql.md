# GraphQL examples

> Template for documenting GraphQL queries, mutations and subscriptions.

---

## Endpoint

| Field | Value |
|---|---|
| URL | `POST https://api.example.com/graphql` |
| Subscriptions URL | `wss://api.example.com/graphql` |
| Auth | Bearer JWT in `Authorization` header |
| Persisted queries | yes — send `?queryId=<sha256>` in production |

---

## Query: `getOrder`

```graphql
query GetOrder($id: ID!) {
  order(id: $id) {
    id
    status
    totalAmountCents
    currency
    items {
      sku
      quantity
      unitPriceCents
    }
    createdAt
  }
}
```

### Variables

```json
{ "id": "ord_01H..." }
```

### Successful response

```json
{
  "data": {
    "order": {
      "id": "ord_01H...",
      "status": "PENDING_PAYMENT",
      "totalAmountCents": 12990,
      "currency": "BRL",
      "items": [
        { "sku": "SKU-001", "quantity": 2, "unitPriceCents": 4990 },
        { "sku": "SKU-002", "quantity": 1, "unitPriceCents": 3010 }
      ],
      "createdAt": "2026-05-18T12:34:56Z"
    }
  }
}
```

### Error response

```json
{
  "data": { "order": null },
  "errors": [
    {
      "message": "Order not found",
      "extensions": { "code": "NOT_FOUND", "id": "ord_01H..." }
    }
  ]
}
```

---

## Mutation: `createOrder`

```graphql
mutation CreateOrder($input: CreateOrderInput!) {
  createOrder(input: $input) {
    order { id status totalAmountCents }
    errors { field message code }
  }
}
```

### Variables

```json
{
  "input": {
    "customerId": "cus_01H...",
    "items": [
      { "sku": "SKU-001", "quantity": 2 },
      { "sku": "SKU-002", "quantity": 1 }
    ],
    "shippingAddress": { "country": "BR", "postalCode": "01001-000" },
    "idempotencyKey": "4b6f7d6a-1234-5678-90ab-c0ffee000001"
  }
}
```

### Convention: errors as data

Validation errors come back inside `errors` (typed, not GraphQL errors). Transport-level errors (auth, server) come in the top-level `errors` array.

```json
{
  "data": {
    "createOrder": {
      "order": null,
      "errors": [
        { "field": "items[0].sku", "message": "unknown SKU", "code": "UNKNOWN_SKU" }
      ]
    }
  }
}
```

---

## Subscription: `orderStatusChanged`

```graphql
subscription OrderStatusChanged($orderId: ID!) {
  orderStatusChanged(orderId: $orderId) {
    id
    status
    changedAt
  }
}
```

### Notes

- Subscription pings every 30s — the client must respond within 10s or be disconnected.
- After reconnection the server re-sends the **last known status** before resuming live updates.
- Subscriptions require a token with scope `orders:subscribe`.
