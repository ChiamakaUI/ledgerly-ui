# Ledgerly

A paid video call booking platform on Solana. Hosts set availability and rates, callers book and pay USDC via on-chain escrow, both join video calls, and funds auto-distribute when the call ends.

**Live:** [ledgerl.netlify.app](https://ledgerl.netlify.app) · devnet

![Booking flow](./docs/hero.png)

## Features

- **1:1 calls** — slot picker, on-chain deposit, embedded-wallet signing, video room, host-confirmed payout with a fifteen-minute time-lock.
- **Group sessions** — capped multi-seat sessions with a shared room. Host pinned, active-speaker rotation for the rest.
- **Gifts** — pay for someone else's call. They claim via email and bind their own wallet.
- **Token-gated discounts** — hosts attach a Flipcash currency to their profile; holders get a configurable percent off.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Privy embedded wallets · `@solana/web3.js` · Vidbloq SDK for video · Netlify.

Solana programs: booking escrow on devnet, Flipcash bonding-curve pool on mainnet.

## Setup

```bash
git clone <repo>
cd ledgerly-ui
npm install
cp .env.example .env.local   # fill in env vars
npm run dev
```

Requires Node 20+. Dev server runs on `:3000` and expects the backend on `:8081`.

### Environment

```
NEXT_PUBLIC_API_BASE_URL
NEXT_PUBLIC_PRIVY_APP_ID
NEXT_PUBLIC_SOLANA_RPC_URL              # devnet — Helius recommended
NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL      # mainnet — Helius or Alchemy
```

`api.mainnet-beta.solana.com` returns 403 to browser clients. Use a dedicated RPC.

## Project structure

```
app/                 routes (booking, sessions, calls, dashboard, gift claim)
components/          booking, call, host, ui primitives
lib/
  api.ts             typed API client
  flipcash.ts        Flipcash endpoints (mainnet)
  solana.ts          devnet tx builder
  mainnet-tx.ts      mainnet tx builder
  network.ts         per-flow network selection
  wallet.ts          useWallet — Privy + signature normalization
types/index.ts       shared types
```

Bookings settle on devnet, token purchases on mainnet. `lib/network.ts` is the single source of truth for which RPC and chain identifier each flow uses.

## Build

```bash
npm run build
```

The production build is stricter than `npm run dev`. Run it before pushing.

## Deployment

Frontend deploys to Netlify on push to `main`. Backend is a separate service on Railway.

## Related

- [Ledgerly Server](https://github.com/ChiamakaUI/ledgerly-server) — Node.js, PostgreSQL, Anchor
