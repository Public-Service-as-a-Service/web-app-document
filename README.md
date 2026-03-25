# web-app-document

Dokumenthanteringsapplikation.

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
# Fyll i CLIENT_KEY och CLIENT_SECRET (hämtas från WSO2-portalen)
yarn dev
```

### Frontend

```bash
cd frontend
yarn install
cp .env.example .env
yarn dev
```

## API-konfiguration

Se `backend/src/config/api-config.ts` för API-versioner.
