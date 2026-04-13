# Frontend Rules

## Stack

- **Next.js 16** with App Router (`src/app/`)
- **React 19** with Server Components by default
- **@sk-web-gui/react** + **@sk-web-gui/core** — Primary component library (Sundsvall kommun design system)
- **Tailwind CSS 3** with `@sk-web-gui/core` preset — dark mode via `class` strategy
- **Zustand** for client state (`src/stores/`)
- **i18next** for translations (sv/en, namespace: `common`)

## Component library

**@sk-web-gui** is the primary UI library. Always check what's available there before creating custom components or pulling from shadcn.

```tsx
import { Button, Card, Dialog } from '@sk-web-gui/react';
```

When @sk-web-gui lacks a component, use **shadcn/ui** as a complement via the shadcn MCP server. Adapt shadcn components to match the sk-web-gui design tokens and Tailwind config.

## Directory structure

```
src/
├── app/[locale]/     # Pages with locale routing
├── components/       # Shared React components
├── interfaces/       # TypeScript interfaces
├── services/         # API service functions
├── stores/           # Zustand stores
├── styles/           # Global styles (SCSS)
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
- SCSS in `src/styles/` for global styles only
- Follow `@sk-web-gui/core` design tokens — do not hardcode colors or spacing
- Dark mode: use Tailwind `dark:` variants (class-based)

## Build

```bash
yarn dev          # Dev server
yarn build        # Production build (uses webpack bundler)
yarn lint         # ESLint
yarn type-check   # TypeScript validation
```
