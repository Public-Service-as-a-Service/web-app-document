# Dokploy MCP Server

MCP server for managing deployments via the [Dokploy](https://dokploy.com) panel.

## What it does

- **Applications** — deploy, redeploy, start, stop, manage applications
- **Domains** — create, update, delete domains and routing
- **Databases** — manage PostgreSQL and MySQL instances
- **Projects** — list and manage Dokploy projects

## Setup

Requires a Dokploy API key. Get one from the Dokploy panel at panel.sundsvall.dev.

When running the install script, you'll be prompted for your API key:

```
DOKPLOY_API_KEY: <your-api-key>
```

## When to use

Use this for deployment operations — deploying new versions, checking deployment status, managing domains, or troubleshooting production issues.

## Install

```bash
./marketplace/install.sh dokploy
```
