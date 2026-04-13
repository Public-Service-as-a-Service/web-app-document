# sk-dev-tools — AI Development Guidelines

## Package Manager

Always use **yarn**. Never use npm or npx for project commands.

## MCP Tools Available

### shadcn (Component Registry)

Use shadcn as a **complement** to @sk-web-gui. Check sk-web-gui first — only reach for shadcn when the design system doesn't cover your need. Adapt shadcn components to match sk-web-gui design tokens and Tailwind config.

### chrome-devtools (Browser Debugging)

Use for visual verification, console debugging, network inspection, and Lighthouse audits. Prefer this over manual screenshot requests — take screenshots directly to verify UI changes.

### dokploy (Deployment)

Use for deploy operations, domain management, and production troubleshooting. Requires `DOKPLOY_API_KEY` environment variable.

## AI Development Workflow

### Before writing code

1. Read the relevant CLAUDE.md (root, frontend, or backend) for conventions
2. Read existing code in the area you're modifying
3. Check @sk-web-gui for available components before creating custom ones

### When building UI

1. Use @sk-web-gui/react components as the foundation
2. Use shadcn MCP to search for components sk-web-gui doesn't have
3. Use chrome-devtools to take screenshots and verify the result
4. Ensure i18n — all user-facing text via translation keys (sv + en)

### When debugging

1. Use chrome-devtools to inspect console errors, network requests
2. Check the API proxy layer (`app/api/[...path]/route.ts`) for backend communication issues
3. Use dokploy to check deployment status if it's a production issue

### Code quality checks

Run before considering work complete:

```bash
yarn type-check    # TypeScript errors
yarn lint          # ESLint
yarn test:e2e      # Playwright E2E tests
```
