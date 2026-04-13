# sk-dev-tools — AI Tooling Plugin

Claude Code plugin for the web-app-document project. Provides MCP servers, domain knowledge skills, coding guidelines, and AI development workflows.

## Setup

**No manual install needed.** The plugin is pre-configured at project scope via `.claude/settings.json`. When you clone the repo and open Claude Code, it activates automatically.

If the plugin is not loading, run:

```bash
claude plugin marketplace add ./marketplace --scope project
claude plugin install sk-dev-tools@sk-dev-tools --scope project
```

### Keeping in sync

Domain knowledge (skills, references) is read from the repo via `CLAUDE.md` file references — always in sync after `git pull`.

For MCP server or plugin structure changes, run after pulling:

```bash
claude plugin update sk-dev-tools@sk-dev-tools --scope project
```

## What's included

### MCP Servers

| Server              | Description                                                    | Config needed             |
| ------------------- | -------------------------------------------------------------- | ------------------------- |
| **shadcn**          | Browse, search, install shadcn/ui components                   | None                      |
| **chrome-devtools** | Browser debugging — screenshots, console, network, performance | None                      |
| **dokploy**         | Deployment management via Dokploy panel                        | `DOKPLOY_API_KEY` env var |

### Skills

| Skill                      | Description                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| **api-service-document**   | Expert knowledge of the Dept44 document microservice, Express backend proxy, and dual-env auth   |

Skills activate automatically when Claude detects relevant context (e.g., working on document endpoints, backend controllers, or authentication). No manual invocation needed.

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
4. Commit and push — other developers get skill/reference updates on `git pull`, MCP changes on `claude plugin update`

## Structure

```
marketplace/
├── .claude-plugin/
│   ├── marketplace.json   ← Marketplace catalog
│   └── plugin.json        ← Plugin manifest
├── .mcp.json              ← MCP server configurations
├── CLAUDE.md              ← AI development guidelines (loaded with plugin)
├── README.md              ← This file
├── tools/                 ← Per-tool documentation
│   ├── shadcn.md
│   ├── chrome-devtools.md
│   └── dokploy.md
└── skills/                ← Domain knowledge skills
    └── api-service-document/
        ├── SKILL.md           ← Core skill (architecture, patterns, auth)
        └── references/        ← Detailed reference docs
            ├── api-endpoints.md
            ├── architecture.md
            ├── backend-integration.md
            └── domain-model.md
```
