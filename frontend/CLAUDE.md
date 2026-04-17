# Frontend Rules

## Stack

- **Next.js 16** with App Router (`src/app/`)
- **React 19** with Server Components by default
- **shadcn/ui** — Primary component library (`src/components/ui/`)
- **Tailwind CSS 4** with CSS-based configuration — dark mode via `class` strategy
- **next-themes** for dark/light/system theme switching
- **Zustand** for client state (`src/stores/`)
- **i18next** for translations (sv/en, namespace: `common`)

## Component library

**shadcn/ui** is the primary UI library. Components live in `src/components/ui/`.

```tsx
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Dialog, DialogContent } from '@components/ui/dialog';
```

Use `cn()` from `@lib/utils` for conditional class merging.

### Before building a new component — shadcn-first, non-negotiable

**Do NOT write UI from scratch when shadcn already provides it.** Hand-rolling primitives that shadcn ships (buttons, dialogs, popovers, tooltips, alerts, badges, breadcrumbs, tabs, tables, forms, skeletons, sheets, command palettes, date pickers, charts, etc.) is the single most common wasted effort in this repo. Every one-off creates drift, accessibility gaps, and dark-mode bugs.

**Required order, every time you need a piece of UI:**

1. **Check local first** — look in `src/components/ui/` for an already-installed shadcn primitive. If it exists, use it as-is. Already installed: Alert, Dialog, Popover, Tooltip, ToggleGroup, Badge, Breadcrumb, Tabs, Button, Input, Textarea, Select, Sheet, Skeleton, Switch, Label, Table, Card, Separator, DropdownMenu, ConfirmDialog, Sonner (toast), and more.
2. **Check the registry via the shadcn MCP** — if it's not local, it probably exists upstream. Use the MCP tools (do not guess component names, do not copy from the web):
   - `mcp__shadcn__search_items_in_registries` with query and `registries: ["@shadcn"]` — fuzzy search
   - `mcp__shadcn__view_items_in_registries` with `items: ["@shadcn/<name>"]` — inspect source
   - `mcp__shadcn__get_item_examples_from_registries` with query `"<name>-demo"` — see full usage example
   - `mcp__shadcn__get_add_command_for_items` with `items: ["@shadcn/<name>"]` — get the `yarn` add command, then run it
   - `mcp__shadcn__get_audit_checklist` after installing — self-check the install
3. **Use the shadcn skills** — when planning a component-heavy surface, consult the shadcn skill output from the MCP (examples, variants, accessibility notes). Lean on what's already designed and tested.
4. **Hand-roll only as a last resort** — if neither local nor registry has it. Follow shadcn conventions exactly: Tailwind + `cn()`, `data-slot` attributes, semantic color tokens (`bg-card`, `text-foreground`, `border-border` — never raw hex), variant props via `cva` when applicable. Put it in `src/components/ui/`.

**Concrete anti-examples to avoid:**
- Writing a custom `<p role="alert">` — use `Alert` + `AlertDescription` with `variant="destructive"`.
- Writing a custom popover with `useRef` + `useEffect` click-outside — use `Popover` + `PopoverContent`.
- Writing a custom confirm dialog — use the already-installed `ConfirmDialog` (or compose `Dialog` + `DialogContent` + `DialogFooter`).
- Writing a custom toast via `useState` — use `toast` from `sonner`.
- Writing a custom skeleton `<div className="bg-muted animate-pulse" />` — use `Skeleton` from `@components/ui/skeleton`.

**Before hand-rolling anything, you MUST have:**
- Searched the registry via the MCP (not just local — the registry is bigger than what's installed)
- Read at least one `-demo` example
- Justified in your reply why no existing primitive fits

This rule takes precedence over convenience. If a user asks for UI, use shadcn. Period.

## Multi-tenant theming

The app supports multi-tenant branding via `NEXT_PUBLIC_TENANT_ID` environment variable.

- Tenant configs: `src/config/tenants/`
- Tenant type: `src/config/tenant-types.ts`
- Logo assets: `public/tenants/{tenant-id}/logo.svg`
- Access via `useTenant()` hook from `@components/tenant-provider/tenant-provider`

## Directory structure

```
src/
├── app/[locale]/     # Pages with locale routing
├── components/       # Shared React components
│   ├── ui/           # shadcn/ui components
│   └── ...           # App-specific components
├── config/           # Tenant configuration
├── interfaces/       # TypeScript interfaces
├── lib/              # Utilities (cn, etc.)
├── services/         # API service functions
├── stores/           # Zustand stores
├── styles/           # Global styles (CSS)
├── utils/            # Utility functions
└── proxy.ts          # i18n middleware
```

## Path aliases

Use these instead of relative imports:

```
@app/*        → src/app/*
@components/* → src/components/*
@services/*   → src/services/*
@interfaces/* → src/interfaces/*
@stores/*     → src/stores/*
@styles/*     → src/styles/*
@utils/*      → src/utils/*
@lib/*        → src/lib/*
@config/*     → src/config/*
```

## Routing & i18n

- All pages under `app/[locale]/` — locale param is `sv` or `en`
- Default locale: `sv`
- Translations in `/locales/{sv,en}/common.json`
- Middleware (`proxy.ts`) handles locale routing via `next-i18n-router`

## API proxy

- All backend calls go through `app/api/[...path]/route.ts`
- This catch-all proxy forwards to `BACKEND_URL/api/{path}`
- Use `@utils/api-url.ts` to construct API paths from client components
- Supports GET, POST, PUT, PATCH, DELETE + multipart/form-data

## Styling

- Use Tailwind utility classes first
- CSS variables defined in `src/styles/globals.css`
- Use shadcn semantic color tokens: `text-foreground`, `bg-card`, `border-border`, etc.
- Dark mode: use Tailwind `dark:` variants (class-based via next-themes)

## Build

```bash
yarn dev          # Dev server
yarn build        # Production build (uses webpack bundler)
yarn lint         # ESLint
yarn type-check   # TypeScript validation
```
