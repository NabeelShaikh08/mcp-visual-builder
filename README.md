# MCP Visual Builder

Build, test, and deploy MCP (Model Context Protocol) servers visually — without writing raw code.

## What It Does

1. **Build** — Define tools visually: name, description, inputs, API endpoint, auth
2. **Test** — Chat with Claude live in the browser — it calls your tools in real time
3. **Export** — Download a ready-to-run `server.js` + Claude Desktop config

## Quick Start

```bash
# Install dependencies
npm install

# Add your Anthropic API key
cp .env.local.example .env.local
# edit .env.local — add your ANTHROPIC_API_KEY

# Run dev server
npm run dev
```

Open http://localhost:3000

## Stack

- Next.js 15 (App Router)
- TypeScript (strict)
- Tailwind CSS
- Anthropic API (test chat)
- @modelcontextprotocol/sdk (server codegen)

## Project Structure

```
src/
├── app/
│   ├── page.tsx          — landing page
│   ├── builder/page.tsx  — main builder UI
│   └── api/chat/route.ts — test chat API route
├── components/
│   ├── ToolForm.tsx       — add/edit tool form
│   ├── ToolList.tsx       — list of defined tools
│   ├── TestChat.tsx       — live test chat UI
│   └── ExportPanel.tsx    — code export + deploy instructions
├── lib/
│   ├── codegen.ts         — generates server.js from tool definitions
│   └── utils.ts           — cn(), toSnakeCase(), generateId()
└── types/index.ts         — all TypeScript interfaces
```
