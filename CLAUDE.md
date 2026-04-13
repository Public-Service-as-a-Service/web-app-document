# Project: web-app-document

Sundsvalls kommun document management web application.

## Architecture

- **frontend/** — Next.js 16 (App Router) with React 19, shadcn/ui, Tailwind CSS 4, multi-tenant theming
- **backend/** — Express + routing-controllers (TypeScript), proxied via Next.js API routes
- **Deploy** — Docker Compose on Dokploy (panel.sundsvall.dev), Traefik routing via dokploy-network

## Rules

### Package manager

Always use **yarn**. Never use npm or npx for project commands (npx is fine for MCP servers and one-off tools).

```bash
yarn install    # install deps
yarn dev        # start dev server
yarn build      # production build
yarn add <pkg>  # add dependency
```

### Language

- All code in **TypeScript** (strict mode)
- Comments and commit messages in **English**
- UI text via i18n (Swedish primary, English secondary)

### Git

- Commit messages: concise, English, explain "why" not "what"
- Do not push without explicit user confirmation
- Do not amend existing commits unless asked
- **Never** add `Co-Authored-By` or any AI attribution to commits, PRs, or branches — the user is the sole author

### Code style

- Follow existing patterns in each directory — do not introduce new conventions
- Use path aliases (`@components/*`, `@services/*`, etc.) instead of relative imports
- No unnecessary abstractions, comments, or type annotations on unchanged code

### Testing

- E2E tests with Playwright: `yarn test:e2e`
- Lint: `yarn lint`
- Type check: `yarn type-check`

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
