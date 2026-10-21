# CLAUDE.md — MCP Visual Builder

This file tells AI assistants exactly how this codebase works so they can help effectively without guessing.

---

## What This Project Is

A Next.js 15 web app that lets users build MCP (Model Context Protocol) servers visually — no coding required. Users define tools, connect them to REST APIs, test them live, and export a ready-to-run `server.js` for Claude Desktop.

Stack: Next.js 15 App Router · TypeScript strict · Tailwind CSS · Supabase (auth + Postgres) · Drizzle ORM · Vercel AI SDK · Anthropic API.

---

## Critical Rules — Read Before Touching Anything

1. **Never commit secrets.** `.env.local` and `.mcp.json` are gitignored. Never add them to git.
2. **Never add `Co-Authored-By` lines to commit messages.** The user has explicitly asked for this.
3. **Never commit `tsconfig.tsbuildinfo`.** It is gitignored and auto-generated.
4. **Always run `node_modules/.bin/tsc --noEmit` after editing TypeScript.** Zero errors required before committing.
5. **Credentials are never stored in the database.** They live only in localStorage (encrypted) and are sent to API routes only for the duration of a request. Do not change this.
6. **All API routes are auth-guarded.** Every route calls `createServerSupabaseClient()` and checks `getUser()`. Do not remove these guards.
7. **SSRF protection must stay on both routes.** `api/chat/route.ts` and `api/tool-test/route.ts` both have `isPrivateHost()` checks. Do not remove or bypass them.

---

## Architecture in One Paragraph

The browser holds all state in `src/app/builder/page.tsx`. Two hooks feed it: `useAuth` (Supabase session) and `useServers` (server list, with localStorage + cloud sync). When the user saves a server, it writes to localStorage immediately then debounces a `POST /api/servers` to Supabase Postgres. Credentials are AES-GCM encrypted before touching localStorage and never go to the database. The Live Test and AI Chat tabs send requests to server-side API routes which proxy real HTTP calls to external APIs (Shopify, GitHub, etc.). Code generation (`lib/codegen.ts`) runs entirely client-side — no server involved.

---

## File Map

```
src/
├── app/
│   ├── page.tsx                    Landing page — shows auth error banner if ?error=auth_failed
│   ├── login/page.tsx              Google OAuth sign-in button
│   ├── builder/page.tsx            ALL builder state — 600+ lines, the heart of the app
│   ├── auth/callback/route.ts      Exchanges OAuth code → session, redirects to /builder
│   └── api/
│       ├── servers/route.ts        GET (list) + POST (upsert) — rate limited, validated
│       ├── servers/[id]/route.ts   DELETE — checks userId ownership
│       ├── chat/route.ts           AI Chat: builds tools from McpServer def, calls Claude
│       └── tool-test/route.ts      Live Test: proxies one tool call to real API
│
├── components/
│   ├── ToolForm.tsx                Controlled form for creating/editing McpTool
│   ├── ToolList.tsx                Renders tools with expand/duplicate/delete/edit
│   ├── TestChat.tsx                Chat UI — sends to /api/chat, renders messages
│   ├── LiveToolTest.tsx            Per-tool test panel — sends to /api/tool-test
│   ├── ExportPanel.tsx             Renders generated code with copy/download
│   ├── TemplateLibrary.tsx         Grid of templates + packs from lib/packs.ts
│   └── PackInstaller.tsx           Credential form + install flow for ToolPack
│
├── hooks/
│   ├── useAuth.ts                  Returns { user, loading, authState, signInWithGoogle, signOut }
│   └── useServers.ts               Returns { servers, syncing, syncError, updateServers, deleteServerFromCloud }
│
├── lib/
│   ├── codegen.ts                  generateServerCode / generateClaudeConfig / generateInstallScript*
│   ├── packs.ts                    TOOL_PACKS: ToolPack[] — 10 packs, ~57 tools total
│   ├── crypto.ts                   encryptCredentials / decryptCredentials (AES-GCM, Web Crypto API)
│   ├── utils.ts                    generateId (crypto.randomUUID), toSnakeCase, cn
│   └── db/
│       ├── schema.ts               mcp_servers table definition (Drizzle)
│       └── index.ts                postgres() client + db export
│
├── middleware.ts                   Runs on every request — refreshes Supabase session cookies
└── types/index.ts                  ToolInput, ApiConnector, McpTool, McpServer, ToolPack, etc.
```

---

## Key Types (from `src/types/index.ts`)

```typescript
McpTool {
  id: string          // crypto.randomUUID()
  name: string        // snake_case — used as tool identifier by Claude
  description: string // what the AI reads to decide when to call this tool
  inputs: ToolInput[]
  connector: ApiConnector {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    url: string        // with {placeholder} tokens e.g. https://api.x.com/{id}
    authType: 'none' | 'bearer' | 'api-key' | 'basic'
    authHeader?: string   // header name for api-key e.g. "X-API-Key"
    bodyTemplate?: string // POST body template e.g. '{"name":"{name}"}'
  }
}

McpServer {
  id, name, description, tools: McpTool[], createdAt, updatedAt
}

ToolPack {
  id, name, description, icon, category, authRequired
  tools: Omit<McpTool, 'id'>[]   // ids assigned at install time
}
```

---

## How URL Placeholders Work

URLs use `{placeholder}` syntax: `https://api.example.com/orders/{order_id}?limit={limit}`

At runtime:
1. `credentials` are merged with `args`: `allArgs = { ...args, ...credentials }`
2. Path placeholders → `encodeURIComponent(String(v))`
3. Query placeholders → encoded + dropped if value is empty (optional params)
4. Body templates → direct string substitution (no encoding)

In codegen: config values (like `shop_domain`) are baked in at generation time using `split/join` (not RegExp, to avoid injection). Runtime args become `${args.placeholder}` template literal expressions.

---

## Auth Flow

1. User → `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: /auth/callback })`
2. `/auth/callback` exchanges `code` → session cookie
3. `middleware.ts` runs `supabase.auth.getUser()` on every request → refreshes expired tokens
4. API routes call `createServerSupabaseClient()` → `getUser()` → 401 if null
5. Sign-out clears session + removes `mcp-builder-credentials-v2` + `mcp-builder-salt` from localStorage

---

## Credential Encryption

`lib/crypto.ts` uses the Web Crypto API (browser-only):
- Key: 32 random bytes stored as base64 in `localStorage['mcp-builder-salt']`
- Encrypt: random 12-byte IV + AES-GCM 256 → base64(IV + ciphertext)
- Decrypt: slice IV, decrypt, JSON.parse
- Falls back gracefully (returns `{}`) on any error

Credentials structure: `{ [serverId]: { token?, shop_domain?, consumer_key?, ... } }`

---

## Cloud Sync Behaviour

- `updateServers(updated[])`: saves to localStorage immediately, then debounces 1s → POST each server
- `syncError` clears on next successful sync — it is NOT sticky
- On load: cloud data takes precedence over localStorage
- Local servers are automatically uploaded to cloud on first login
- Credentials are intentionally excluded from sync (localStorage only)

---

## API Routes — Important Details

### `POST /api/chat`
- Rate limit: 15 req/min per IP (in-memory Map, evicts at >500 entries)
- No API key → returns `{ isSimulation: true }` (not an error)
- Builds Vercel AI SDK `CoreTool` objects dynamically from `McpServer.tools`
- `maxSteps: 5` — Claude can call up to 5 tools per response
- Model: `claude-haiku-4-5`

### `POST /api/tool-test`
- No rate limit (auth is the gate)
- Returns `{ success, output, status, durationMs }` on success
- Returns `{ success: false, error, status, body, durationMs }` on API error
- Output: tries JSON.parse, falls back to raw text, falls back to `'(empty response)'`
- Timeout: 10 seconds (AbortController)

### `POST /api/servers`
- Rate limit: 60 writes/min per user (in-memory, keyed by userId)
- Validates: id (required), name (≤200), description (≤1000), tools (array ≤100)
- Each tool validated: id, name, description strings + inputs array + connector object
- Uses `onConflictDoUpdate` — safe to call repeatedly (upsert pattern)

---

## Code Generation — Important Notes

`lib/codegen.ts` runs **client-side only** — never on the server.

- `safeName` and `safeDesc` strip `*/` sequences to prevent JSDoc comment injection
- Credential values baked into URL use `split/join` not `new RegExp()` — avoids regex injection if the credential value contains special characters
- Generated code uses ES modules (`type: 'module'`), top-level `await`
- Generated server targets `@modelcontextprotocol/sdk ^1.32.1` and `zod ^3.25.0`

---

## Adding a New API Pack

Edit `src/lib/packs.ts`. Add to the `TOOL_PACKS` array:

```typescript
{
  id: 'my-api',
  name: 'My API',
  description: 'What this pack does',
  icon: '🔌',
  category: 'Productivity',
  authRequired: true,
  authLabel: 'My API Token',
  authPlaceholder: 'token_...',
  setupGuideUrl: 'https://docs.myapi.com/auth',
  tools: [
    {
      name: 'my_api_list_items',   // snake_case
      description: 'List items from My API. Returns id, name, status.',
      inputs: [
        { id: generateId(), name: 'limit', type: 'number', description: 'Max results', required: false },
      ],
      connector: {
        method: 'GET',
        url: 'https://api.myservice.com/v1/items?limit={limit}',
        authType: 'bearer',
      },
    },
  ],
}
```

Rules for good tool definitions:
- `name`: snake_case, starts with the service name e.g. `github_list_repos`
- `description`: tell Claude WHAT it returns, not just what it does — Claude decides when to call it based on this
- Optional inputs: use `required: false` and put them as query params with `{placeholder}` syntax — they'll be dropped if empty
- Auth: use `bearer` for `Authorization: Bearer {token}`, `api-key` for custom header + `authHeader`, `basic` for username/password

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong |
|---------|---------------|
| Storing credentials in the database | Credentials are intentionally browser-only |
| Using `Math.random()` for IDs | Use `crypto.randomUUID()` — already in `lib/utils.ts` as `generateId()` |
| Adding `unsafe-eval` to CSP for production | Only allowed in dev — `next.config.ts` already handles this |
| Removing auth guards from API routes | Opens SSRF abuse vector — all routes must stay auth-guarded |
| Using `new RegExp(userInput)` | Use `split(literal).join(replacement)` instead to avoid injection |
| Nesting `<button>` inside `<button>` | Invalid HTML — use `<div role="button" tabIndex={0} onKeyDown={...}>` |
| Committing `tsconfig.tsbuildinfo` or `.mcp.json` | Both are gitignored for good reason |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes (for AI Chat) | From console.anthropic.com — if missing, chat runs in simulation mode |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `DATABASE_URL` | Yes | Postgres connection string from Supabase |

---

## Database

Single table: `mcp_servers`

```sql
id          TEXT PRIMARY KEY
user_id     TEXT NOT NULL        -- indexed
name        TEXT NOT NULL
description TEXT NOT NULL DEFAULT ''
tools       JSONB NOT NULL DEFAULT '[]'
created_at  TIMESTAMP NOT NULL DEFAULT now()
updated_at  TIMESTAMP NOT NULL DEFAULT now()
```

Run `npm run db:push` to create/update the table. Run `npm run db:studio` for a visual browser.

---

## Testing Checklist (no automated tests yet)

Before shipping a change, manually verify:
- [ ] Create a new tool, save it, reload — tool persists
- [ ] Undo/redo works for tool edits
- [ ] Install a pack — correct tool count shown in toast
- [ ] Live Test returns real data (requires sign-in + valid credentials)
- [ ] AI Chat calls a tool and returns a formatted response
- [ ] Export tab shows generated code with no obvious syntax errors
- [ ] Sign out → sign back in → servers still there (cloud sync)
- [ ] `node_modules/.bin/tsc --noEmit` returns zero errors
