# MCP Visual Builder

**Build, test, and ship MCP servers without writing code.**

MCP (Model Context Protocol) is the standard that lets Claude talk to external tools — your Shopify store, GitHub repos, Stripe payments, Notion pages, and anything else with a REST API. But building an MCP server today means writing Node.js code, understanding schemas, setting up auth, and debugging JSON — that's a barrier most people can't clear.

MCP Visual Builder removes that barrier entirely. You define your tools visually in a browser, test them live, and export a production-ready server in under two minutes.

---

## The Problem It Solves

Before MCP Visual Builder, connecting Claude to your own APIs required:
- Writing a Node.js MCP server from scratch
- Learning the `@modelcontextprotocol/sdk` API
- Manually defining Zod schemas for every parameter
- Handling auth headers, URL templating, error cases
- Setting up your environment and running the server locally

That's hours of work for a developer, and completely inaccessible to non-developers.

**MCP Visual Builder makes it a 2-minute task for anyone.**

---

## What You Can Do With It

### Build
Define tools visually — no code needed:
- Give the tool a name and description (this is what Claude reads to decide when to use it)
- Add input parameters with types (string, number, boolean, enum)
- Connect to any REST API endpoint with GET/POST/PUT/PATCH/DELETE
- Configure auth: Bearer token, API key header, or Basic auth
- Optionally define a request body template for POST/PUT calls

### Test
Verify your tools actually work before deploying:
- **Live API Test** — run real HTTP calls against your actual API with real credentials, see the response instantly
- **AI Chat** — chat with Claude directly in the browser; it calls your tools automatically when relevant, just like it would in production

### Export
Download everything you need to run your server:
- `server.js` — a complete, production-ready MCP server
- `claude_desktop_config.json` — paste this into Claude Desktop and you're done
- `install.sh` / `install.ps1` — one-click installer scripts for Mac/Linux and Windows

### One-Click Packs
Install complete pre-built API integrations in seconds:

| Pack | Tools | What You Can Do |
|------|-------|-----------------|
| **Shopify** | 12 | Query orders, products, customers, inventory, fulfillments, store info |
| **Stripe** | 9 | Customers, charges, invoices, subscriptions, balance |
| **GitHub** | 8 | Repos, issues, pull requests, commits, file contents |
| **Notion** | 5 | List databases, query pages, search, create pages |
| **Airtable** | 5 | List, get, create, update, delete records |
| **WooCommerce** | 8 | Orders, products, customers, order status |
| **OpenWeatherMap** | 2 | Current weather, forecast |
| **NewsAPI** | 2 | Top headlines, search news |
| **CoinGecko** | 3 | Crypto prices, coin info, market data |
| **REST Countries** | 3 | Country data, search by name or code |

---

## How It Works (The Simple Version)

```
You define a tool:
  Name: shopify_list_orders
  URL:  https://{shop_domain}/admin/api/2025-01/orders.json?limit={limit}
  Auth: API Key → X-Shopify-Access-Token

Claude understands:
  "I have a tool called shopify_list_orders.
   I call it when the user asks about orders.
   It needs a limit parameter."

User asks: "Show me my last 10 orders"
Claude calls: shopify_list_orders({ limit: 10 })
MCP server fetches: Shopify API → returns JSON
Claude reads the data and replies in plain English.
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) account (free)
- An [Anthropic API key](https://console.anthropic.com) (for AI Chat)

### 1. Clone and install

```bash
git clone https://github.com/NabeelShaikh08/mcp-visual-builder
cd mcp-visual-builder
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** → copy your Project URL and anon key
3. Go to **Settings → Database → Connection string → URI** → copy the Postgres URL
4. Go to **Authentication → Providers → Google** → enable it
5. Add `http://localhost:3000/auth/callback` to your Google OAuth redirect URIs in the [Google Cloud Console](https://console.cloud.google.com)

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

### 4. Create the database table

```bash
npm run db:push
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add all four env vars in **Project → Settings → Environment Variables**
4. Add your Vercel domain to Google OAuth redirect URIs:
   `https://your-app.vercel.app/auth/callback`
5. Run `npm run db:push` with your production `DATABASE_URL` to create the table
6. Deploy

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    Landing page
│   ├── login/page.tsx              Google sign-in page
│   ├── builder/page.tsx            Main builder UI (all state lives here)
│   ├── auth/callback/route.ts      OAuth callback handler
│   └── api/
│       ├── servers/route.ts        GET/POST server definitions
│       ├── servers/[id]/route.ts   DELETE a server
│       ├── chat/route.ts           AI Chat — Anthropic API + tool execution
│       └── tool-test/route.ts      Live tool test — proxies real API calls
│
├── components/
│   ├── ToolForm.tsx                Add/edit a tool (form + validation)
│   ├── ToolList.tsx                Tool list with expand/edit/duplicate/delete
│   ├── TestChat.tsx                AI Chat UI (messages, send, clear)
│   ├── LiveToolTest.tsx            Live API test panel per tool
│   ├── ExportPanel.tsx             Code viewer + download for all generated files
│   ├── TemplateLibrary.tsx         Browse individual templates and packs
│   └── PackInstaller.tsx           Credential form + install flow for API packs
│
├── hooks/
│   ├── useAuth.ts                  Supabase auth state (loading/authenticated/unauth)
│   └── useServers.ts               Server list state + localStorage + cloud sync
│
└── lib/
    ├── codegen.ts                  Generates server.js, install scripts, claude config
    ├── packs.ts                    All 10 pre-built API pack definitions
    ├── crypto.ts                   AES-GCM 256-bit credential encryption
    ├── utils.ts                    generateId(), toSnakeCase(), cn()
    └── db/                         Drizzle ORM schema + Postgres client
```

---

## Architecture

### Frontend
- **Next.js 15** App Router with TypeScript (strict mode)
- All builder state in `builder/page.tsx` — single source of truth
- `useAuth` + `useServers` hooks manage auth and server sync
- Credentials AES-GCM encrypted before hitting localStorage
- Undo/redo stack (50 steps) for all tool edits

### Backend
- **Next.js API routes** — no separate backend process
- All routes auth-guarded via Supabase session cookies
- SSRF protection: private IPs, localhost, metadata endpoints all blocked
- Rate limiting: 15 chat requests/min per IP, 60 server writes/min per user
- `User-Agent: MCPBuilder/1.0` on all outbound API calls

### Database
- **Supabase Postgres** via Drizzle ORM
- Single `mcp_servers` table — stores server + tool definitions as JSONB
- Credentials are intentionally never stored server-side

### AI
- **Anthropic claude-haiku-4-5** for AI Chat (fast + cheap)
- Vercel AI SDK `generateText` with `maxSteps: 5` (up to 5 tool calls per response)
- Tools are built dynamically from your MCP server definition at request time

### Security
- All API routes require valid Supabase session
- CSP headers: `unsafe-eval` removed in production
- SSRF block: 10.x, 172.16–31.x, 192.168.x, 169.254.x, localhost, ::1
- `.mcp.json` gitignored (may contain API tokens)
- Credentials cleared from localStorage on sign-out

---

## Available Scripts

```bash
npm run dev          # Development server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run db:push      # Push schema to database (create/update tables)
npm run db:studio    # Drizzle Studio — visual database browser
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Z` | Undo last tool change |
| `Ctrl+Shift+Z` | Redo |
| `?` | Show/hide keyboard shortcuts help |
| `Escape` | Close open modals |

---

## How Credentials Work

Your API tokens **never leave your browser unencrypted** and are **never stored in the database**.

1. You enter credentials in the Pack Installer
2. They are encrypted with AES-GCM 256-bit using a per-browser key
3. The encrypted blob is stored in `localStorage`
4. When you run a Live Test or AI Chat, credentials are sent to the server **for that request only**, used to make the API call, then discarded
5. When you sign out, both the encrypted credentials and the encryption key are deleted from `localStorage`

---

## Built by Nabeel Shaikh
