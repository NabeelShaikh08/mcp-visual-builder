# MCP Visual Builder — Data Flow

This document shows exactly how data moves through every part of the system: from user actions in the browser, through state management, to API routes, the database, and external APIs.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│  page.tsx ──→ login/page.tsx ──→ auth/callback/route.ts    │
│                                                             │
│  builder/page.tsx                                           │
│  ├── useAuth.ts         (Supabase session state)            │
│  ├── useServers.ts      (server list + cloud sync)          │
│  ├── ToolForm.tsx       (create/edit tool)                  │
│  ├── ToolList.tsx       (display tools)                     │
│  ├── TemplateLibrary    (browse templates)                  │
│  ├── PackInstaller      (install API packs)                 │
│  ├── LiveToolTest.tsx   (test real API calls)               │
│  ├── TestChat.tsx       (AI chat with tools)                │
│  └── ExportPanel.tsx    (generate + download files)         │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP (fetch, cookies)
┌──────────────────▼──────────────────────────────────────────┐
│                   NEXT.JS SERVER                            │
│                                                             │
│  middleware.ts          (session refresh on every request)  │
│                                                             │
│  /api/servers    GET/POST   (read/write server definitions) │
│  /api/servers/[id] DELETE  (delete one server)              │
│  /api/tool-test  POST       (proxy real API call)           │
│  /api/chat       POST       (AI chat with tool execution)   │
└──────┬───────────────────────────────┬───────────────────────┘
       │                               │
┌──────▼───────┐              ┌────────▼────────────────────┐
│  Supabase    │              │  External APIs               │
│  (Postgres)  │              │  (Shopify, GitHub, Stripe…)  │
│              │              └─────────────────────────────┘
│  mcp_servers │
│  table       │              ┌─────────────────────────────┐
└──────────────┘              │  Anthropic API               │
                              │  (claude-haiku-4-5)          │
                              └─────────────────────────────┘
```

---

## 1. Authentication Flow

```
User clicks "Sign in with Google"
        │
        ▼
useAuth.ts → supabase.auth.signInWithOAuth()
        │   provider: 'google'
        │   redirectTo: /auth/callback
        │
        ▼
Google OAuth screen → user approves
        │
        ▼
/auth/callback/route.ts
  ├── reads `code` from URL params
  ├── supabase.auth.exchangeCodeForSession(code)
  │     → Supabase sets session cookie in browser
  └── redirect → /builder
        │
        ▼
middleware.ts (runs on EVERY request)
  ├── reads session cookie
  ├── supabase.auth.getUser()  ← validates + refreshes token
  └── writes refreshed cookie back to response
        │
        ▼
builder/page.tsx
  └── useAuth.ts
        ├── supabase.auth.getUser()  → { user } or null
        ├── onAuthStateChange()      → live updates
        └── exposes: { user, loading, authState, signInWithGoogle, signOut }

Sign Out:
  signOut()
    ├── supabase.auth.signOut()           (clears server session)
    ├── localStorage.removeItem(CREDS_KEY) (removes encrypted creds)
    ├── localStorage.removeItem(SALT_KEY)  (removes encryption key)
    └── redirect → /
```

---

## 2. Server State Flow (Local + Cloud Sync)

```
builder/page.tsx
  └── useServers(user)
        │
        ├── ON MOUNT (user logged in):
        │     fetch GET /api/servers
        │       ├── success: setServers(cloudServers) + saveLocal()
        │       └── fail:    setServers(loadLocal())  + setSyncError()
        │
        ├── ON MOUNT (not logged in):
        │     loadLocal() → setServers(localStorage data)
        │
        ├── updateServers(updated[]):
        │     ├── setServers(updated)          (immediate local update)
        │     ├── saveLocal(updated)            (instant localStorage write)
        │     └── debounce 1s → POST /api/servers for each server
        │                         ├── success: setSyncError(null)
        │                         └── fail:    setSyncError('Sync failed')
        │
        └── deleteServerFromCloud(id):
              fetch DELETE /api/servers/{id}
                ├── success: done
                └── fail:    setSyncError('Delete sync failed')

localStorage keys:
  'mcp-builder-servers-v2'      → JSON array of McpServer[]
  'mcp-builder-credentials-v2'  → AES-GCM encrypted credentials
  'mcp-builder-salt'            → base64 encryption key
```

---

## 3. Credential Encryption Flow

```
User enters API token in PackInstaller
        │
        ▼
builder/page.tsx: setAllCredentials({ [serverId]: { token: '...' } })
        │
        ▼
useEffect → lib/crypto.ts: encryptCredentials(allCredentials)
  ├── getOrCreateKey()
  │     ├── read 'mcp-builder-salt' from localStorage
  │     ├── if missing: generate 32 random bytes, store as base64
  │     └── crypto.subtle.importKey(rawBytes, 'AES-GCM', 256)
  ├── generate random 12-byte IV
  ├── crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, JSON)
  └── store: base64(IV + ciphertext) → localStorage['mcp-builder-credentials-v2']

On load:
  decryptCredentials(rawCreds)
    ├── getOrCreateKey()   (reads same salt → same key)
    ├── slice first 12 bytes → IV
    ├── slice rest → ciphertext
    └── crypto.subtle.decrypt() → JSON.parse() → credentials object

Credentials are NEVER:
  - sent to Supabase or the database
  - included in exported server.js (only env var references are generated)
  - stored in plaintext (always AES-GCM encrypted at rest)

Credentials ARE sent:
  - to /api/tool-test  (for the duration of that HTTP request only)
  - to /api/chat       (for the duration of that HTTP request only)
```

---

## 4. Tool Creation Flow

```
User clicks "+ Add Tool"
        │
        ▼
builder/page.tsx: setShowForm(true)
        │
        ▼
ToolForm.tsx receives: { initial: null, existingTools, onSave, onCancel }
  │
  ├── User fills in:
  │     name        → toSnakeCase()  → validated /^[a-z][a-z0-9_]*$/
  │     description → free text
  │     method      → GET/POST/PUT/PATCH/DELETE
  │     url         → https://api.example.com/{city}
  │     authType    → none / bearer / api-key / basic
  │     authHeader  → (if api-key) e.g. X-API-Key
  │     bodyTemplate → (if POST/PUT/PATCH) JSON with {placeholder}s
  │     inputs[]    → each: { name, type, description, required, enumValues? }
  │
  ├── validate() checks:
  │     - name required + regex + unique
  │     - description required
  │     - url required
  │     - each input name required + snake_case
  │
  └── onSave(tool: McpTool) → builder/page.tsx
        ├── pushUndo(server.tools)     (save current state for Ctrl+Z)
        ├── update tools array
        └── updateServer({ tools }) → useServers.updateServers()
```

---

## 5. Pack Installation Flow

```
User clicks "Templates" → TemplateLibrary.tsx opens
        │
        ├── Browse individual templates → "Add" → builder/page.tsx: addSingleTool()
        │
        └── Browse packs → "Install Pack" → PackInstaller.tsx
              │
              ▼
        PackInstaller receives: { pack: ToolPack, onInstall, onClose }
          ├── shows credential fields (token, shop_domain, etc.)
          ├── user fills in credentials
          └── "Install" → onInstall(tools, creds)
                │
                ▼
          builder/page.tsx: installPack(tools, creds)
            ├── filter out tools with duplicate names
            ├── updateServer({ tools: [...existing, ...newTools] })
            ├── setAllCredentials({ [serverId]: creds })
            │     └── triggers encryption → localStorage
            └── showToast("12 tools added" or "8 added, 4 skipped")

lib/packs.ts exports TOOL_PACKS: ToolPack[]
  10 packs × N tools each:
  ┌─────────────────┬───────┬─────────────────────────┐
  │ Pack            │ Tools │ Auth                    │
  ├─────────────────┼───────┼─────────────────────────┤
  │ Shopify Store   │  12   │ API Key (X-Shopify-...)  │
  │ Stripe          │   9   │ Bearer token             │
  │ GitHub          │   8   │ Bearer token             │
  │ Notion          │   5   │ Bearer token             │
  │ Airtable        │   5   │ Bearer token             │
  │ WooCommerce     │   8   │ Basic (key + secret)     │
  │ OpenWeatherMap  │   2   │ API Key (appid param)    │
  │ NewsAPI         │   2   │ API Key (apiKey param)   │
  │ CoinGecko       │   3   │ None (public API)        │
  │ REST Countries  │   3   │ None (public API)        │
  └─────────────────┴───────┴─────────────────────────┘
```

---

## 6. Live Tool Test Flow

```
User opens "Live Test" tab → LiveToolTest.tsx rendered per tool
        │
        ▼
User fills in input fields and clicks "Run live test"
        │
        ▼
fetch POST /api/tool-test
  body: { tool: McpTool, args: Record<string,string>, credentials }
        │
        ▼
api/tool-test/route.ts
  ├── auth guard: supabase.auth.getUser() → 401 if not logged in
  ├── coerceArgs(tool, rawArgs)
  │     string → string, number → parseFloat, boolean → val==='true'
  ├── buildUrl(tool.connector.url, { ...args, ...credentials })
  │     ├── replaces {placeholder} in path
  │     ├── encodes query param values
  │     └── drops empty optional query params
  ├── validateUrl(resolvedUrl)
  │     ├── must be http/https
  │     ├── no path traversal (/../)
  │     └── no SSRF (private IPs, localhost, 169.254.x.x, etc.)
  ├── build headers:
  │     Content-Type: application/json
  │     User-Agent: MCPBuilder/1.0
  │     Authorization: Bearer {token}         (if bearer)
  │     {authHeader}: {key}                   (if api-key)
  │     Authorization: Basic base64(u:p)      (if basic)
  │     Notion-Version: 2022-06-28            (if Notion URL)
  │     Accept + X-GitHub-Api-Version         (if GitHub URL)
  ├── fetch(resolvedUrl, { method, headers, body? })
  │     timeout: 10 seconds (AbortController)
  ├── on !res.ok → return { success:false, error, status, body, durationMs }
  └── on success → parse text → try JSON.parse → pretty print
                             → fallback raw text
                 → return { success:true, output, status, durationMs }
        │
        ▼
LiveToolTest.tsx displays result:
  ├── green banner: Success — HTTP 200 — 234ms
  ├── red banner:   Failed — HTTP 401
  ├── error message (if any)
  └── response body in <pre> block
```

---

## 7. AI Chat Flow

```
User opens "AI Chat" tab → TestChat.tsx
        │
        ▼
User types message and submits
        │
        ▼
fetch POST /api/chat
  body: { messages[], server: McpServer, credentials }
        │
        ▼
api/chat/route.ts
  ├── auth guard: supabase.auth.getUser() → 401 if not logged in
  ├── IP rate limit: 15 requests/minute (in-memory Map)
  │     429 + Retry-After: 60 if exceeded
  ├── check ANTHROPIC_API_KEY
  │     if missing → return { isSimulation: true, content: '...' }
  ├── createAnthropic({ apiKey })
  ├── build aiTools: Record<string, CoreTool>
  │     for each McpTool in server.tools:
  │       buildZodSchema(mcpTool.inputs)    → z.object({ ... })
  │       tool({ description, parameters, execute: async (args) =>
  │         executeTool(mcpTool, args, credentials)
  │           ├── buildUrl()   (same as tool-test)
  │           ├── validateUrl() + SSRF check
  │           ├── build headers (same logic)
  │           ├── fetch() with 10s timeout
  │           └── return JSON.stringify({ status, data })
  │       })
  ├── generateText({
  │     model: anthropic('claude-haiku-4-5'),
  │     system: 'You are a helpful assistant testing MCP server...',
  │     messages: [{ role, content }...],
  │     tools: aiTools,
  │     maxSteps: 5       ← allows up to 5 tool calls in one response
  │   })
  └── return { content: result.text }
        │
        ▼
TestChat.tsx:
  ├── appends assistant message to messages[]
  ├── shows { isSimulation } badge if no API key
  └── shows "Ready" badge if live
```

---

## 8. Cloud Sync (Server CRUD) Flow

```
GET /api/servers
  ├── auth: getUser() → 401 if unauth
  └── db.select().from(mcp_servers).where(userId = user.id)
        └── return { servers: McpServer[] }

POST /api/servers  (upsert)
  ├── auth: getUser()
  ├── per-user write rate limit: 60 writes/minute
  ├── validate:
  │     id: required string
  │     name: required, max 200 chars
  │     description: max 1000 chars
  │     tools: array, max 100 items
  │     each tool: { id, name, description, inputs[], connector{} }
  └── db.insert(mcp_servers).onConflictDoUpdate(...)
        target: mcp_servers.id
        updates: name, description, tools, updatedAt

DELETE /api/servers/{id}
  ├── auth: getUser()
  └── db.delete().where(id = id AND userId = user.id)
        (userId check prevents deleting other users' servers)

Database schema (Drizzle ORM → Supabase Postgres):
  mcp_servers
    id          text PRIMARY KEY
    user_id     text NOT NULL  ← indexed
    name        text NOT NULL
    description text NOT NULL DEFAULT ''
    tools       jsonb NOT NULL DEFAULT []
    created_at  timestamp NOT NULL DEFAULT now()
    updated_at  timestamp NOT NULL DEFAULT now()
```

---

## 9. Code Generation Flow

```
User opens "Export" tab → ExportPanel.tsx
        │
        ▼
lib/codegen.ts functions called client-side (no server involved):

generateServerCode(server, credentials)
  ├── for each tool:
  │     genZodSchema(inputs, credentialKeys)
  │       → 'z.object({ city: z.string().describe("...") })'
  │     genFetchCall(tool, credentials)
  │       ├── bake config values into URL (shop_domain etc.)
  │       │   using split/join (not RegExp — avoids injection)
  │       ├── convert remaining {placeholders} → ${args.x} template literals
  │       ├── build headers string (Bearer, api-key, basic)
  │       └── build fetch() call with timeout + error handling
  │     → server.tool("name", "description", schema, async(args) => { ... })
  └── return complete server.js file content as string

generateClaudeConfig(server, credentials)
  → claude_desktop_config.json with env block

generateServerPackageJson(server)
  → { name, version, type: 'module', dependencies: { @modelcontextprotocol/sdk, zod } }

generateInstallScriptUnix(server, credentials)
  → bash script: mkdir, write server.js, write package.json, npm install

generateInstallScriptWindows(server, credentials)
  → PowerShell script using here-strings (@'...'@) to write files

ExportPanel renders each as syntax-highlighted <pre> with copy + download buttons
Privacy warning shown: "Do not commit exported files to public repos"
```

---

## 10. Undo / Redo Flow

```
builder/page.tsx maintains two stacks:
  undoStack: McpTool[][]   (each entry = full tools array snapshot)
  redoStack: McpTool[][]

pushUndo(currentTools):
  setUndoStack([...prev.slice(-49), currentTools])  ← max 50 steps
  setRedoStack([])                                    ← clears redo

undo():
  pop from undoStack → tools
  push server.tools to redoStack
  updateServer({ tools })

redo():
  pop from redoStack → tools
  push server.tools to undoStack
  updateServer({ tools })

Keyboard shortcuts (window event listener):
  Ctrl+Z        → undo()
  Ctrl+Shift+Z  → redo()
  ?             → toggle shortcuts modal (ignored if focus in input/textarea)
  Escape        → close modals
```

---

## 11. Full Request Lifecycle (Example: Shopify order lookup)

```
1. User types: "Show me my last 5 orders"
   TestChat.tsx → POST /api/chat { messages, server, credentials }

2. api/chat/route.ts:
   → auth check ✓
   → rate limit check ✓
   → build aiTools: shopify_list_orders = tool({ execute: executeTool })

3. generateText() sends to Anthropic:
   "You are testing MCP server 'shopify_mcp'..."
   "User: Show me my last 5 orders"
   tools: [shopify_list_orders, shopify_get_order, ...]

4. Claude decides to call shopify_list_orders({ limit: 5 })

5. executeTool() runs:
   URL: https://testing-vfzq3bsp.myshopify.com/admin/api/2025-01/orders.json?limit=5
   Headers: X-Shopify-Access-Token: shpat_xxx, User-Agent: MCPBuilder/1.0
   fetch() → Shopify API responds with orders JSON

6. Tool result returned to Claude: { status: 200, data: { orders: [...] } }

7. Claude formats a readable response:
   "Here are your last 5 orders: ..."

8. api/chat returns { content: "Here are your last 5 orders..." }

9. TestChat.tsx appends assistant message → user sees formatted response
```

---

## Key Data Structures

```typescript
// The core unit — one callable tool
McpTool {
  id: string                    // crypto.randomUUID()
  name: string                  // snake_case, e.g. "shopify_list_orders"
  description: string           // shown to the AI model
  inputs: ToolInput[]           // parameters the AI must supply
  connector: ApiConnector {
    method: GET|POST|PUT|PATCH|DELETE
    url: string                 // with {placeholder} tokens
    authType: none|bearer|api-key|basic
    authHeader?: string         // e.g. "X-Shopify-Access-Token"
    bodyTemplate?: string       // POST body with {placeholder} tokens
  }
}

// One server = collection of tools
McpServer {
  id: string                    // crypto.randomUUID()
  name: string                  // e.g. "shopify_mcp"
  description: string
  tools: McpTool[]
  createdAt: string             // ISO 8601 UTC
  updatedAt: string             // ISO 8601 UTC
}

// Credentials — browser only, never in DB
allCredentials: {
  [serverId: string]: {
    token?: string              // API token / Bearer token
    shop_domain?: string        // e.g. "mystore.myshopify.com"
    consumer_key?: string       // WooCommerce
    consumer_secret?: string    // WooCommerce
    api_user?: string           // Basic auth username
    api_pass?: string           // Basic auth password
  }
}
```
