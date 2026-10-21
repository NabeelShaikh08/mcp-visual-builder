# MCP Visual Builder

Build, test, and deploy MCP (Model Context Protocol) servers visually — without writing code.

Connect any REST API to Claude Desktop in under two minutes: define tools visually, test them live in the browser, then export a ready-to-run `server.js`.

---

## Features

- **Visual tool builder** — name, description, inputs, endpoint URL, auth type
- **One-click packs** — pre-built connectors for Shopify, Notion, GitHub, Stripe, Airtable, WooCommerce, and more
- **Live API test** — run real HTTP calls against your tools directly in the browser
- **AI Chat** — chat with Claude and watch it call your tools in real time
- **Export** — download `server.js` + install scripts for Mac and Windows
- **Cloud sync** — servers saved to Supabase, accessible across devices
- **Undo / Redo** — full history for tool edits

---

## Quick Start (Local Dev)

### 1. Clone and install

```bash
git clone https://github.com/NabeelShaikh08/mcp-visual-builder
cd mcp-visual-builder
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy your project URL and anon key
3. Go to **Settings → Database → Connection string → URI** and copy the Postgres URL
4. Go to **Authentication → Providers → Google** and enable Google OAuth
   - Add `http://localhost:3000/auth/callback` to your Google OAuth redirect URIs

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...          # from console.anthropic.com
NEXT_PUBLIC_SUPABASE_URL=https://...  # from Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=...     # from Supabase project settings
DATABASE_URL=postgresql://...          # from Supabase database settings
```

### 4. Create the database table

```bash
npm run db:push
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add all four environment variables in **Vercel → Project → Settings → Environment Variables**:
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL`
4. In Supabase, add your Vercel domain to Google OAuth redirect URIs:
   - `https://your-app.vercel.app/auth/callback`
5. Deploy — Vercel runs the build automatically

> **Database migration on first deploy:** run `npm run db:push` locally with `DATABASE_URL` pointing to your production Supabase instance to create the table before the first request.

---

## How It Works

### Architecture

```
Browser (Next.js client)
  └── builder/page.tsx        — main UI, state management
      ├── useAuth.ts           — Supabase Google OAuth
      ├── useServers.ts        — local + cloud sync (debounced 1s)
      └── components/          — ToolForm, ToolList, TestChat, etc.

Next.js API Routes (server)
  ├── /api/servers             — CRUD for server definitions (Drizzle + Postgres)
  ├── /api/chat                — AI Chat (Vercel AI SDK + Claude Haiku)
  └── /api/tool-test           — Live API test (proxies real HTTP calls)

Code Generation (client-side)
  └── lib/codegen.ts           — generates server.js, install scripts, claude config
```

### Auth flow

1. User clicks "Sign in with Google" → Supabase OAuth redirect
2. Google redirects to `/auth/callback` → Supabase exchanges code for session
3. Session cookie set → user returned to `/builder`
4. All API routes verify session via `createServerSupabaseClient()`

### Sync flow

- Servers are always saved to `localStorage` first (instant, offline-safe)
- When logged in, changes are debounced 1s then pushed to Supabase via `POST /api/servers`
- On load, cloud servers take precedence over local ones
- Local servers are automatically uploaded to cloud on first login

### Credentials

- API credentials (tokens, keys) are encrypted with AES-GCM 256-bit before being stored in `localStorage`
- Credentials are never sent to or stored in the cloud — they stay in the browser
- During Live Test and AI Chat, credentials are sent server-side only for the duration of the request

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  — landing page
│   ├── login/page.tsx            — Google sign-in page
│   ├── builder/page.tsx          — main builder UI
│   ├── auth/callback/route.ts    — OAuth callback handler
│   └── api/
│       ├── servers/route.ts      — GET/POST server definitions
│       ├── servers/[id]/route.ts — DELETE server
│       ├── chat/route.ts         — AI Chat endpoint
│       └── tool-test/route.ts    — Live tool test proxy
├── components/
│   ├── ToolForm.tsx              — add/edit tool form
│   ├── ToolList.tsx              — tool list with expand/duplicate/delete
│   ├── TestChat.tsx              — AI Chat UI
│   ├── LiveToolTest.tsx          — live API test panel
│   ├── ExportPanel.tsx           — code export + install instructions
│   ├── TemplateLibrary.tsx       — pre-built tool templates
│   └── PackInstaller.tsx         — one-click API pack installer
├── hooks/
│   ├── useAuth.ts                — auth state
│   └── useServers.ts             — server state + cloud sync
└── lib/
    ├── codegen.ts                — generates server.js, install scripts
    ├── packs.ts                  — pre-built API pack definitions
    ├── crypto.ts                 — AES-GCM credential encryption
    ├── utils.ts                  — generateId, toSnakeCase, cn
    └── db/                       — Drizzle ORM schema + client
```

---

## Available Scripts

```bash
npm run dev          # start development server
npm run build        # production build
npm run start        # start production server
npm run lint         # ESLint
npm run db:push      # push schema to database (Drizzle Kit)
npm run db:studio    # open Drizzle Studio (database GUI)
```

---

## Supported API Packs

| Pack | Auth Type | Tools |
|------|-----------|-------|
| Shopify | API Key | Orders, Products, Customers |
| Notion | Bearer | Pages, Databases |
| GitHub | Bearer | Repos, Issues, PRs |
| Stripe | Bearer | Payments, Customers |
| Airtable | Bearer | Records |
| WooCommerce | Basic Auth | Orders, Products, Customers |
| OpenWeatherMap | API Key | Weather |
| NewsAPI | API Key | Headlines |
| CoinGecko | None | Crypto Prices |
| REST Countries | None | Country Data |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `?` | Show/hide shortcuts help |
| `Escape` | Close modals |

---

## Security

- All API routes require authentication (Supabase session)
- Outbound requests from the server are SSRF-protected (private IPs blocked)
- URL query parameters are percent-encoded to prevent injection
- Credentials are AES-GCM encrypted in localStorage
- Security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy

---

## Built by Nabeel Shaikh
