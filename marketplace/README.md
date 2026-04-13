# sk-dev-tools — AI Tooling Plugin

Claude Code plugin for the web-app-document project. Provides MCP servers, coding guidelines, and AI development workflows.

## Install

```bash
claude plugin add ./marketplace
```

Then restart Claude Code. The plugin's MCP servers and rules activate automatically.

## What's included

### MCP Servers

| Server              | Description                                                    | Config needed             |
| ------------------- | -------------------------------------------------------------- | ------------------------- |
| **shadcn**          | Browse, search, install shadcn/ui components                   | None                      |
| **chrome-devtools** | Browser debugging — screenshots, console, network, performance | None                      |
| **dokploy**         | Deployment management via Dokploy panel                        | `DOKPLOY_API_KEY` env var |

### Rules & Guidelines

The plugin loads AI development guidelines automatically:

- When to use which MCP tool
- UI development workflow (sk-web-gui first, shadcn as complement)
- Debugging workflow with chrome-devtools
- Code quality checks to run before completing work

### Project Rules (always active)

These are not part of the plugin — they load automatically from the repo:

- `CLAUDE.md` — Global project conventions (yarn, TypeScript, git)
- `frontend/CLAUDE.md` — Frontend stack rules (Next.js 16, sk-web-gui, Tailwind)
- `backend/CLAUDE.md` — Backend stack rules (Express, routing-controllers)

## Setup for Dokploy

The dokploy MCP requires an API key. Set it in your shell profile:

```bash
# ~/.zshrc or ~/.bashrc
export DOKPLOY_API_KEY="your-api-key-here"
```

Get your key from the Dokploy panel at panel.sundsvall.dev.

## Adding a New MCP Server

1. Add the server config to `marketplace/.mcp.json`
2. Document it in this README and `marketplace/CLAUDE.md`
3. Optionally add a detailed guide in `marketplace/tools/<name>.md`
4. Commit and push — other developers get it on next `claude plugin update`

## Structure

```
marketplace/
├── plugin.json        ← Plugin manifest
├── .mcp.json          ← MCP server configurations
├── CLAUDE.md          ← AI development guidelines (loaded with plugin)
├── README.md          ← This file
└── tools/             ← Per-tool documentation
    ├── shadcn.md
    ├── chrome-devtools.md
    └── dokploy.md
```
