# web-app-document

Dokumenthanteringsapplikation.

## Tech stack

### Frontend
- **Next.js 16** — React-ramverk med App Router, Turbopack (dev), standalone output
- **React 19** — UI-bibliotek
- **TypeScript** — Typsäkerhet
- **@sk-web-gui** — Sundsvalls kommuns designsystem (komponenter och Tailwind-preset)
- **Tailwind CSS 3** — Utility-first CSS via sk-web-gui preset
- **Sass** — SCSS för globala stilar
- **Zustand** — State management
- **i18next / react-i18next** — Internationalisering (sv/en)
- **Axios** — HTTP-klient

### Backend
- **Express** — HTTP-server
- **routing-controllers** — Decorator-baserad routing
- **Axios** — HTTP-klient mot WSO2/mikrotjänster
- **Winston** — Logging med daglig filrotation
- **Helmet / HPP / CORS / Rate-limit** — Säkerhetsmiddleware
- **TypeScript** — Typsäkerhet

### Infrastruktur
- **Docker Compose** — Orkestrering av frontend + backend
- **Dokploy** — Deploy och domänhantering
- **Traefik** — Reverse proxy med automatiska Let's Encrypt-cert

## Arkitektur

```
Browser → Next.js server (documents.sundsvall.dev)
              ↓ Route Handler proxy (/api/*)
          Backend Express (internt i Docker)
              ↓
          WSO2 API Gateway (api-i-sundsvall.se)
              ↓
          Mikrotjänster
```

Frontend gör API-anrop till Next.js Route Handlers (`/api/*`) på samma domän.
Route Handlers proxiar vidare till backend internt i Docker-nätverket.
Backend är aldrig exponerad publikt — all trafik går via Next.js-servern.

## Krav

- [Node](https://nodejs.org/en) >= 20 LTS
- [Yarn](https://classic.yarnpkg.com/en/docs/install)

## Utveckling

```bash
git clone <repo-url>
cd web-app-document
```

### Backend

```bash
cd backend
yarn install
cp .env.example .env
# Fyll i API_BASE_URL, CLIENT_KEY och CLIENT_SECRET (hämtas från WSO2-portalen)
yarn dev
```

### Frontend

```bash
cd frontend
yarn install
cp .env.example .env
yarn dev
```

Frontend når backend via `BACKEND_URL` (default `http://localhost:3010`).

## Miljövariabler

### Frontend (`frontend/.env`)
| Variabel | Beskrivning | Default |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | Appnamn | `Dokument` |
| `NEXT_PUBLIC_BASE_PATH` | Base path för routing | `/document` |
| `BACKEND_URL` | Intern URL till backend | `http://localhost:3010` |

### Backend (`backend/.env`)
| Variabel | Beskrivning | Default |
|---|---|---|
| `PORT` | Server-port | `3010` |
| `BASE_URL_PREFIX` | API-prefix | `/api` |
| `API_BASE_URL` | WSO2 gateway URL | — |
| `CLIENT_KEY` | OAuth client key | — |
| `CLIENT_SECRET` | OAuth client secret | — |
| `ORIGIN` | Tillåten CORS-origin | `http://localhost:3000` |
| `MUNICIPALITY_ID` | Kommun-ID | `2281` |

## API-konfiguration

Se `backend/src/config/api-config.ts` för API-versioner.
