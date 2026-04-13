# Chrome DevTools MCP Server

MCP server that gives Claude access to Chrome DevTools Protocol for browser inspection and debugging.

## What it does

- **Screenshots** — capture page state for visual debugging
- **Console** — read console messages and errors
- **Network** — inspect network requests and responses
- **Performance** — run traces and analyze performance
- **Lighthouse** — run audits for accessibility, performance, SEO
- **DOM interaction** — click, fill, navigate, hover
- **Memory** — take heap snapshots

## When to use

Use this when debugging frontend issues, verifying UI changes, or running performance/accessibility audits. Particularly useful for:

- Checking that a UI change looks correct
- Debugging console errors after a code change
- Verifying network requests to the backend
- Running Lighthouse audits before deploy

## Options

Add flags to the args in config.json:

- `--headless` — run without visible browser window
- `--slim` — minimal toolset for basic tasks
- `--viewport 1280x720` — set initial viewport size

## Install

```bash
./marketplace/install.sh chrome-devtools
```
