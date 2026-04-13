# Backend Rules

## Stack

- **Express** with **routing-controllers** (decorator-based routing)
- **TypeScript** (strict)
- **Winston** for logging (daily rotate)
- Production behind Next.js API proxy (not directly exposed)

## Architecture

```
src/
├── server.ts         # Entry point — instantiates App with controllers
├── app.ts            # Express app setup, middleware chain, error handling
├── config/           # Environment config
├── controllers/      # Route handlers (@Controller, @Get, @Post, etc.)
├── services/         # Business logic and external API calls
├── middlewares/       # Error handling, rate limiting
├── interfaces/       # TypeScript types
├── exceptions/       # HttpException class
└── utils/            # Logger, helpers
```

## Path aliases

```
@config/*       → config/*
@controllers/*  → controllers/*
@services/*     → services/*
@exceptions/*   → exceptions/*
@middlewares/*   → middlewares/*
@utils/*        → utils/*
```

## Conventions

- Controllers use `routing-controllers` decorators (`@Controller`, `@Get`, `@Post`, `@Patch`, `@Delete`)
- Services handle external API communication (Sundsvall municipality APIs)
- Route prefix configured via `BASE_URL_PREFIX` env var
- Use `class-validator` + `class-transformer` for request validation
- Throw `HttpException` for error responses — caught by error middleware

## Middleware chain

Morgan (logging) → HPP → Helmet → Compression → CORS → Body parsers → Routes → Error handler

## Security

- Helmet for security headers
- HPP for parameter pollution protection
- CORS whitelist (bypassed in development)
- Rate limiting via `express-rate-limit`
- Never expose internal error details in production responses

## Build & Run

```bash
yarn dev          # Development with nodemon + ts-node
yarn build        # Compile TS → dist/ (tsc + tsc-alias)
yarn start        # Run compiled output
yarn start:prod   # Production mode
```

## Environment

Key variables (set in docker-compose.yml or .env):

- `PORT` — Server port (default 3000 in Docker)
- `API_BASE_URL` — Upstream municipality API
- `CLIENT_KEY` / `CLIENT_SECRET` — API authentication
- `MUNICIPALITY_ID` — Target municipality (default 2281 = Sundsvall)
- `BASE_URL_PREFIX` — Route prefix (default /api)
- `ORIGIN` — CORS allowed origin
