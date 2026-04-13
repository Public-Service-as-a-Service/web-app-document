# shadcn/ui MCP Server

Official MCP server for the [shadcn/ui](https://ui.shadcn.com) component registry.

## What it does

Gives Claude direct access to the shadcn/ui component registry:

- **Browse** all available components, blocks, and templates
- **Search** for components by name or functionality
- **View** component source code, props, and usage examples
- **Install** components with natural language

## When to use

This project uses **@sk-web-gui** as the primary component library. Use shadcn as a **complement** when sk-web-gui doesn't have what you need. Always adapt shadcn components to match the sk-web-gui design tokens.

## Example prompts

- "Show me available shadcn dialog components"
- "Search shadcn for a data table component"
- "What props does the shadcn combobox have?"

## Install

```bash
./marketplace/install.sh shadcn
```
