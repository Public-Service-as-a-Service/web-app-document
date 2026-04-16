# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Sundsvalls kommun document management web application. See `frontend/CLAUDE.md` and `backend/CLAUDE.md` for detailed sub-project rules.

## Architecture

```
Browser → Next.js (frontend) → Route Handler proxy (/api/*) → Express (backend) → WSO2 Gateway → Municipality APIs
```

- **frontend/** — Next.js 16 (App Router), React 19, shadcn/ui, Tailwind CSS 4, Zustand, i18next (sv/en)
- **backend/** — Express + routing-controllers (TypeScript), decorator-based routing, Winston logging
- **Deploy** — Docker Compose on Dokploy (panel.sundsvall.dev), Traefik reverse proxy via dokploy-network

The backend is never publicly exposed — all traffic goes through the Next.js server. Frontend calls `/api/*` route handlers which proxy to the backend internally.

### Authentication

- **User auth**: SAML SSO for production, token-based mock login for development (`AUTH_TYPE` env var)
- **API auth**: Pluggable strategy pattern (`AUTH_MODE` env var) — `oauth2` for production (client credentials via WSO2), development can use API key or none
- OAuth2 tokens are cached with auto-refresh (10s buffer before expiry)

### Frontend API proxy

Catch-all at `frontend/src/app/api/[...path]/route.ts` — forwards all methods + headers to `BACKEND_URL/api/{path}`. Handles JSON, binary responses, and multipart uploads.

## Development

**Requires**: Node >= 20 LTS, Yarn

This is a monorepo — install and run from each sub-directory:

```bash
# Backend (terminal 1)
cd backend
yarn install
cp .env.example .env    # fill in API_BASE_URL, CLIENT_KEY, CLIENT_SECRET
yarn dev                # starts on :3010

# Frontend (terminal 2)
cd frontend
yarn install
cp .env.example .env
yarn dev                # starts on :3000
```

### Common commands

```bash
# Root-level (runs across both sub-projects)
yarn lint               # lint frontend + backend
yarn type-check         # type-check frontend + backend
yarn format             # prettier format all files
yarn format:check       # check formatting

# Frontend-specific (run from frontend/)
yarn dev                # dev server
yarn build              # production build (webpack bundler)
yarn test:e2e           # Playwright E2E tests
yarn test:e2e:ui        # Playwright with UI
yarn test:e2e:chromium  # run only chromium tests

# Backend-specific (run from backend/)
yarn dev                # dev server with nodemon
yarn build              # compile TS → dist/
```

## Rules

### Package manager

Always use **yarn**. Never use npm or npx for project commands (npx is fine for MCP servers and one-off tools).

### Language

- All code in **TypeScript** (strict mode)
- Comments and commit messages in **English**
- UI text via i18n (Swedish primary, English secondary)

### Git

- **Conventional commits** enforced by commitlint: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `build:`, `ci:`, `chore:`, `revert:`
- Husky pre-commit hook runs lint-staged (prettier + lint + type-check on changed files)
- Commit messages: concise, English, explain "why" not "what"
- Do not push without explicit user confirmation
- Do not amend existing commits unless asked
- **Never** add `Co-Authored-By` or any AI attribution to commits, PRs, or branches — the user is the sole author

### Code style

- Follow existing patterns in each directory — do not introduce new conventions
- Use path aliases (`@components/*`, `@services/*`, etc.) instead of relative imports
- No unnecessary abstractions, comments, or type annotations on unchanged code

### Environment

- Frontend env vars prefixed with `NEXT_PUBLIC_` for client-side
- Backend config via `src/config/` and environment variables
- `BACKEND_URL` connects frontend to backend (default `http://localhost:3010` locally, `http://backend:3000` in Docker)

## Document Service (api-service-document)

The backend proxies to a Dept44 Spring Boot microservice (`api-service-document`) for all document operations. When working on document-related backend code, read `marketplace/skills/api-service-document/SKILL.md` for full architecture and patterns. For deeper details, consult the reference files in `marketplace/skills/api-service-document/references/`.

### Key rules for document work

- **Dual auth**: Development uses API key header (`AUTH_MODE=apikey`), production uses OAuth2 via WSO2 (`AUTH_MODE=oauth2`). Build for both.
- **Revision immutability**: Never modify existing document rows. Every change creates a new revision.
- **Municipality scoping**: All API paths require `municipalityId` (default `2281` for Sundsvall).
- **Proxy pattern**: Backend routes at `/api/documents` mirror upstream endpoints 1:1.
- **TypeScript interfaces**: Types in `backend/src/interfaces/document.interface.ts` mirror the Java DTOs. Extend them, don't duplicate.

## AI Tooling

This project includes an AI plugin at `marketplace/` that is pre-configured at project scope via `.claude/settings.json`. It activates automatically — no manual install needed.

Provides: domain knowledge skills (api-service-document), MCP servers (shadcn, chrome-devtools, dokploy), and coding guidelines.

For dokploy access, set your API key: `export DOKPLOY_API_KEY=<your-key>`
