# ProofPay

Blockchain-based milestone escrow for freelancers. See
`ProofPay_Blockchain_Escrow_Project_Specification.pdf` for the full spec —
this repo implements the "Today's MVP Definition" (section 11) plus the
supporting architecture from section 3.

## Architecture

```
Next.js Frontend (wagmi/viem, wallet-signed txs)
        │
        ▼
NestJS API (Postgres + Redis) ── never holds a signer, read-only chain access
        ▲
        │ events
ProofPayEscrow.sol (Hardhat/Solidity) ── sole custodian of escrowed funds
```

The backend never moves funds. Every state-changing action (create escrow,
deposit, add/submit/approve a milestone, release, dispute, refund) is a
transaction signed by the user's own wallet in the frontend. The backend's
job is to mirror on-chain state into Postgres for fast reads, in two ways:

- **Immediate sync**: after a tx confirms, the frontend calls a `POST`
  endpoint with just the `txHash`; the backend waits for the receipt,
  decodes the event, and upserts the row. Nothing about amounts/status is
  ever trusted from the request body — it's read back from the chain.
- **Background sync**: `IndexerService` (`backend/src/indexer`) listens to
  the same contract events continuously and calls the same sync methods,
  so state stays correct even if a client never calls the API (or a request
  is lost).

## Packages

- `contracts/` — Hardhat + Solidity. `ProofPayEscrow.sol` implements the
  full lifecycle from spec section 5 (create/deposit/milestones/dispute/
  refund) plus events for the indexer.
- `backend/` — NestJS + Prisma + PostgreSQL + Redis. Modules: auth (wallet
  signature login), users, escrows, milestones, blockchain (read-only
  contract access + tx confirmation), indexer, disputes, audit logs,
  notifications (log-only stub for now).
- `frontend/` — Next.js (App Router) + wagmi/viem, with a proper app shell
  (sidebar navigation + header) instead of a single scrolling page:
  - **Dashboard** (`/`) — the connected wallet's escrows (as client,
    freelancer, or arbitrator), with a shortcut to create a new one.
  - **New escrow** (`/escrows/new`) — deploys a contract escrow.
  - **Escrow detail** (`/escrows/[onChainId]`) — tabbed: Milestones (fund,
    add/submit/approve/release/dispute), Disputes (evidence + arbitrator
    resolution), Transactions, Events, and Activity (audit trail).
  - **Disputes** (`/disputes`) — every disputed milestone across your
    escrows in one place.
  - **About** (`/about`) — architecture and lifecycle summary for anyone
    landing on the app cold.

## Backend API additions beyond the spec's suggested list

The spec's section 9 lists the minimum lifecycle API. A few read/sync
endpoints were added because the frontend (and the spec's own sections 6–8)
need them and nothing else exposed them:

- `GET /escrows` (auth) — escrows for the signed-in wallet, used by the
  Dashboard. Not in the original list; without it there was no way to find
  your own escrows without already knowing their on-chain ID.
- `GET /escrows/:onChainId/audit-logs` — the `audit_logs` table (spec
  section 10) existed and was written to, but nothing ever read it back.
- `POST /milestones/:id/release` and `POST /milestones/:id/refund` —
  mirror the existing submit/approve/dispute "immediate sync" endpoints for
  `releasePayment`/`refund`. Previously those two only synced via the
  background indexer, so the API's per-action confirmation pattern was
  inconsistent for exactly the two actions that move money.

## Running it locally

### 1. A FAT32 drive note

This project lives on a FAT32 (`vfat`) filesystem, which can't store Unix
permissions or symlinks. Two workarounds are already baked in:

- All `npm install`s here were run with `--no-bin-links`; `package.json`
  scripts call binaries directly via `node node_modules/<pkg>/...` instead
  of relying on `node_modules/.bin` symlinks.
- Prisma's migration engine is a native binary that needs the execute bit,
  which FAT can't grant. `backend/.env` points
  `PRISMA_SCHEMA_ENGINE_BINARY` at a copy under `~/.cache/proofpay-engines/`
  (outside the FAT drive) with the exec bit set there instead. If you clone
  this onto a normal filesystem, delete that line and `npm install` normally
  with bin-links enabled.

### 2. Infrastructure

```bash
docker compose up -d          # Postgres on :5434, Redis on :6380
```

(Ports are non-default because 5432/6379 were already taken on the dev
machine — change them back in `docker-compose.yml` + `backend/.env` if you
want.)

### 3. Smart contract

```bash
cd contracts
npm test                      # full lifecycle + dispute/refund tests
npm run node                  # starts a local chain on :8545 (leave running)
npm run deploy:local          # in a second terminal — deploys and writes
                               # deployments/localhost.json with the address + ABI
```

Copy the deployed address into `backend/.env` and `frontend/.env.local` as
`CONTRACT_ADDRESS` / `NEXT_PUBLIC_CONTRACT_ADDRESS`.

### 4. Backend

```bash
cd backend
cp .env.example .env          # fill in CONTRACT_ADDRESS after deploying
npm run prisma:migrate        # first run only
npm run start:dev             # http://localhost:3001
```

### 5. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_CONTRACT_ADDRESS
npm run dev                        # http://localhost:3000
```

Import one of Hardhat's default local-node private keys into MetaMask (or
any injected wallet) pointed at `http://127.0.0.1:8545`, chain id `31337`,
to act as the client. Use a second imported account as the freelancer.

## What's deliberately not built yet

Per the spec's roadmap (section 12), this now covers V1 (escrow + wallet +
contract), V2/V3 (indexer + proof-of-delivery hash), and V4 (dispute +
arbitration workflow, including the frontend). Still not built:

- V5 timeouts/auto-refund, V6 multi-chain, V7 AI evidence classification —
  explicitly future work per the spec.
- Real notification delivery (email/websocket) — currently a log-only stub,
  see `backend/src/notifications`. The frontend has no live "your milestone
  was approved" push; you have to revisit the page (or the Activity tab).
- Per-role authorization in the backend (checking a JWT's wallet actually
  matches the on-chain client/freelancer for a given action) — the smart
  contract already enforces this on-chain for anything that moves money, so
  backend auth is currently just "is this a signed-in wallet", not a
  security boundary for funds. The frontend hides actions a connected
  wallet can't perform (based on its on-chain role), but that's a UX
  convenience, not enforcement — the contract is what actually blocks it.
- Evidence attachments are hash-only, same as milestone proof-of-delivery
  (spec section 6's model applied consistently) — there's no file storage
  layer, so "evidence" is a note plus a content hash, not an upload.

## Important

Per spec section 15: local/testnet only. Do not point this at mainnet or
handle real funds — there's no KYC/AML, custody, or consumer-protection
layer here.
