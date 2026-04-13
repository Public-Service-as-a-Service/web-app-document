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

## AI Tooling (Plugin)

This project includes a Claude Code plugin at `marketplace/` with MCP servers and AI development guidelines. Install it to get project-scoped tools and standards:

```bash
claude plugin add ./marketplace
```

Provides: shadcn (component registry), chrome-devtools (browser debugging), dokploy (deployment). See `marketplace/README.md` for details.

For dokploy access, set your API key: `export DOKPLOY_API_KEY=<your-key>`
