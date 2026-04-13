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
