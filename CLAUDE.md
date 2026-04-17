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

### UI / shadcn-first (non-negotiable)

**Do NOT write frontend UI from scratch when shadcn already provides it.** This is the single most common wasted effort. Hand-rolling primitives (buttons, dialogs, popovers, tooltips, alerts, badges, breadcrumbs, tabs, tables, forms, skeletons, sheets, command palettes, date pickers, charts, etc.) creates drift, a11y gaps, and dark-mode bugs.

**Required order for any UI work:**

1. **Check `frontend/src/components/ui/`** — if a shadcn primitive is already installed, use it as-is.
2. **Check the shadcn registry via the MCP** — `mcp__shadcn__search_items_in_registries`, `view_items_in_registries`, `get_item_examples_from_registries` (query `"<name>-demo"`), `get_add_command_for_items`, `get_audit_checklist`. Do not guess component APIs or copy snippets off the web — use the MCP.
3. **Use shadcn skills** — the MCP surfaces variants, demos, and accessibility notes. Rely on them before writing CSS.
4. **Hand-roll only if neither exists** — and only following shadcn conventions (Tailwind + `cn()`, `data-slot`, semantic tokens like `bg-card` / `text-foreground`, `cva` variants).

See `frontend/CLAUDE.md → Before building a new component` for the full rule including concrete anti-examples. This rule takes precedence over convenience.

### Design verification (non-negotiable)

After any UI or CSS change — always, before marking a task complete:

1. **Run `npx impeccable detect --json frontend/src/`** from the repo root. Exit 0 = clean. Exit 2 = anti-patterns detected (side-tab borders, gradient text, purple/violet gradients, cyan-on-dark, dark-mode glow, overused fonts like Inter/Roboto, pure black/white, nested cards, small touch targets, etc.). Fix everything the detector flags before continuing.
2. **Verify live in Chrome DevTools MCP** — screenshot the changed surface in light mode, switch to dark mode (`emulate({ colorScheme: "dark" })`), screenshot again, then emulate a mobile viewport (`375x812,mobile,touch`). Read the console for errors. Both themes and both viewports must pass.
3. **Cross-check against `.impeccable.md`** — the design context file at the project root is authoritative; if a change drifts from its principles (warm neutrals, amber ring, Hanken/Source Serif/Geist Mono, no left-stripe active indicators, OKLCH tokens), revise it.

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
