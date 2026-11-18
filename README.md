# B-stores

A warm, editorial-style online bookstore built with Next.js 16. It includes a searchable book collection, category filters, a shopping basket, PKR checkout through PakPays, and server-to-server payment status verification.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The storefront runs at http://localhost:3000.

## PakPays configuration

Create a merchant API key from your PakPays merchant dashboard, then add it to Vercel:

| Variable | Required | Purpose |
| --- | --- | --- |
| `PAKPAYS_API_KEY` | Yes | Your merchant API key. Server-only; never prefix it with `NEXT_PUBLIC_`. |
| `PAKPAYS_API_BASE_URL` | No | Defaults to `https://pakpays.vercel.app`. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Your canonical B-stores URL, including `https://`. Checkout can derive the request origin when this is omitted. |

Add `PAKPAYS_API_KEY` under Vercel → Project → Settings → Environment Variables for Production (and Preview if needed), then redeploy. The API key is only read by the two server routes; it is never sent to the browser.

## Payment flow

1. The browser sends book IDs, quantities, customer name and email to `POST /api/checkout`.
2. The server validates every book against the server-side catalog in `src/lib/books.ts` and calculates the amount itself. A browser-supplied total is never trusted.
3. The server creates a PakPays request using `POST /api/v1/create` with `x-api-key`, a B-stores order reference, customer details, a book summary and the checkout return URL.
4. The customer is redirected to the hosted PakPays checkout page.
5. On return, the bookstore calls `GET /api/order-status?order_id=...`; that server route checks `GET /api/v1/check` with the merchant key. The browser's return query parameters are not treated as proof of payment.

PakPays can keep an order in `pending` while a bank credit is awaiting review. Only `approved` and `merchant_approved` are presented as confirmed payments. A `timeout` does not prove that a transfer was never made; late credits may still need merchant review.

## Store content

Edit `src/lib/books.ts` to change the starter book catalogue, descriptions, categories and PKR prices. Prices are stored as integer paisa (for example, `200` means PKR 2.00) and formatted consistently in the storefront, basket, and server-side checkout. The current test prices range from PKR 2.00 to PKR 20.00. The catalogue is also used by the server checkout route, so the browser cannot change product prices by editing its request.

## Before taking physical-book orders

This starter implements the storefront and payment hand-off, not a full fulfilment platform. It sends customer name, email and the order's book summary to PakPays; it does not yet persist postal addresses, inventory, shipping charges, dispatch status or returns. Add a private order/fulfilment database and your delivery workflow before accepting orders that require shipping. Do not put postal addresses or other sensitive customer details into the public checkout description.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

GitHub Actions runs the same checks on pushes and pull requests.
