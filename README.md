# pulso-backend

NestJS API for Pulso — esports tournament platform focused on a meritocratic talent pipeline for League of Legends in Latin America.

Stack: NestJS 11 · TypeScript 5.7 · Prisma 5 · PostgreSQL 16 · Redis 7 · Pino

## Requirements

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- Docker + Docker Compose

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp .env.example .env

# 3. Start Postgres + Redis
docker compose up -d

# 4. Run database migrations
pnpm prisma:migrate

# 5. Generate Prisma client
pnpm prisma:generate

# 6. Start the API in dev mode
pnpm start:dev
```

API runs at `http://localhost:3000`.
Health check: `http://localhost:3000/health`.

## Common commands

| Command | What it does |
|---|---|
| `pnpm start:dev` | Start API with hot-reload |
| `pnpm build` | Compile to `dist/` |
| `pnpm lint` | Lint and auto-fix |
| `pnpm typecheck` | TS type check (no emit) |
| `pnpm test` | Run unit tests |
| `pnpm prisma:studio` | Open Prisma Studio (DB GUI) |
| `pnpm prisma:migrate` | Apply migrations to dev DB |
| `docker compose up -d` | Start Postgres + Redis |
| `docker compose down` | Stop containers |

## Project structure

```
pulso-backend/
├── prisma/
│   └── schema.prisma         # DB schema (source of truth)
├── src/
│   ├── main.ts               # App entry point
│   ├── app.module.ts         # Root module
│   ├── prisma/               # Prisma service (DI wrapper)
│   ├── health/               # Health check endpoint
│   ├── common/               # Filters, interceptors, guards
│   └── config/               # Env validation
├── test/                     # E2E tests
├── docker-compose.yml        # Local Postgres + Redis
└── .env.example              # Required env vars
```

## Roadmap

See `../docs/ROADMAP.md` (or in `pulso-gg-docs` repo).

## License

UNLICENSED — Private. © 2026 Pulso.
