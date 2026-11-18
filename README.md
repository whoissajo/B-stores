# B-stores

A polished, responsive online bookstore with a secure server-side PakPays checkout integration.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `PAKPAYS_API_KEY` in `.env.local` and in Vercel Project Settings → Environment Variables. The API key is server-only and must never use a `NEXT_PUBLIC_` prefix.
