# Data Flow — MCP Visual Builder

Nabeel Shaikh · MCP Visual Builder

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│  Next.js 15 · TypeScript · Tailwind CSS · Supabase Auth    │
└──────────────────────┬──────────────────────────────────────┘
                       │  HTTPS  (Supabase session cookie)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   NEXT.JS API SERVER                        │
│  /api/servers   /api/servers/[id]                           │
│  /api/chat      /api/tool-test                              │
└──────┬────────────────────────────────┬─────────────────────┘
       │                                │
       ▼                                ▼
┌──────────────────┐          ┌─────────────────────────────┐
│  Supabase        │          │  External REST APIs          │
│  Postgres DB     │          │  (Shopify · GitHub · Stripe  │
│                  │          │   Notion · Airtable · etc.)  │
│  mcp_servers     │          └──────────────�┬──────────────┘
│  (JSONB tools)   │                         │
└──────────────────┘          ┌──────────────▼──────────────┐
                              │  Anthropic API               │
                              │  claude-haiku-4-5            │
                              └─────────────────────────────┘
```

---

## 2. Authentication Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Next.js Frontend
    participant CB as /auth/callback
    participant MW as middleware.ts
    participant SB as Supabase Auth

    U->>F: Click "Sign in with Google"
    F->>SB: signInWithOAuth({ provider: google })
    SB-->>U: Redirect to Google OAuth screen
    U->>SB: Approve Google permissions
    SB-->>CB: Redirect with ?code=xxx
    CB->>SB: exchangeCodeForSession(code)
    SB-->>CB: Session + sets cookie in browser
    CB-->>F: Redirect to /builder

    Note over MW,SB: On every subsequent request
    MW->>SB: getUser() — validates + refreshes expired token
    SB-->>MW: User object or null
    MW-->>F: Refreshed session cookie written to response

    Note over F,SB: Sign Out
    F->>SB: signOut()
    F->>F: removeItem(credentials) + removeItem(salt)
    F-->>U: Redirect to /
```

---

## 3. Server State & Cloud Sync Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as builder/page.tsx
    participant LS as localStorage
    participant H as useServers.ts
    participant API as /api/servers
    participant DB as Supabase Postgres

    Note over B,DB: On page load (logged in)
    B->>H: useServers(user)
    H->>API: GET /api/servers
    API->>DB: SELECT * WHERE user_id = user.id
    DB-->>API: McpServer[]
    API-->>H: { servers: [...] }
    H->>LS: saveLocal(servers)
    H-->>B: setServers(cloudServers)

    Note over B,DB: On page load (not logged in)
    H->>LS: loadLocal()
    LS-->>H: McpServer[] or []
    H-->>B: setServers(localServers)

    Note over B,DB: When user edits a server
    U->>B: Edit tool / rename / install pack
    B->>H: updateServers(updated[])
    H->>LS: saveLocal(updated)  ← instant, offline-safe
    H->>H: debounce 1 second
    H->>API: POST /api/servers (upsert each)
    API->>DB: INSERT ... ON CONFLICT DO UPDATE
    DB-->>API: ok
    API-->>H: { ok: true }
    H->>H: setSyncError(null)  ← clears any previous error
```

---

## 4. Credential Encryption Flow

Credentials (API tokens, shop domains) are **never stored in the database**. They live only in the browser, encrypted.

```
User enters API token in PackInstaller
              │
              ▼
builder/page.tsx: setAllCredentials({ [serverId]: { token: '...' } })
              │
              ▼ (useEffect triggers)
lib/crypto.ts: encryptCredentials(allCredentials)
  ┌─────────────────────────────────────────────────────────┐
  │  getOrCreateKey()                                       │
  │  ├─ read localStorage['mcp-builder-salt']               │
  │  ├─ if missing: generate 32 random bytes, store base64  │
  │  └─ crypto.subtle.importKey(bytes, 'AES-GCM', 256)      │
  ├─────────────────────────────────────────────────────────┤
  │  generate random 12-byte IV                             │
  │  crypto.subtle.encrypt({ AES-GCM, iv }, key, JSON)      │
  │  store → base64(IV + ciphertext) in localStorage        │
  └─────────────────────────────────────────────────────────┘
              │
              ▼
        localStorage['mcp-builder-credentials-v2'] = encrypted blob

On load → decryptCredentials(blob)
  ├─ getOrCreateKey()  (same salt → same key)
  ├─ slice bytes 0–12  → IV
  ├─ slice bytes 12+   → ciphertext
  └─ crypto.subtle.decrypt() → JSON.parse() → credentials object
```

---

## 5. Tool Creation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant TF as ToolForm.tsx
    participant B as builder/page.tsx
    participant H as useServers.ts

    U->>B: Click "+ Add Tool"
    B->>TF: open form (initial: null)
    U->>TF: Fill name · description · URL · method · auth · inputs
    TF->>TF: validate()
    Note right of TF: name: snake_case, unique
    Note right of TF: description: required
    Note right of TF: url: required
    Note right of TF: inputs: each name must be snake_case
    TF->>B: onSave(tool: McpTool)
    B->>B: pushUndo(server.tools)  ← saves to undo stack
    B->>B: update tools array
    B->>H: updateServers(updated)
    H->>H: saveLocal() + debounce sync to cloud
    B-->>U: Tool appears in ToolList
```

---

## 6. Pack Installation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant TL as TemplateLibrary.tsx
    participant PI as PackInstaller.tsx
    participant B as builder/page.tsx
    participant C as lib/crypto.ts

    U->>B: Click "Templates"
    B->>TL: open modal
    U->>TL: Select a pack → "Install Pack"
    TL->>PI: open PackInstaller(pack)
    U->>PI: Enter credentials (token, shop_domain, etc.)
    U->>PI: Click "Install"
    PI->>B: onInstall(tools[], credentials)
    B->>B: filter out duplicate tool names
    B->>B: updateServer({ tools: [...existing, ...newTools] })
    B->>C: encryptCredentials({ [serverId]: creds })
    C-->>B: encrypted blob → localStorage
    B-->>U: Toast: "12 tools added" or "8 added, 4 skipped"
```

---

## 7. Live Tool Test Flow

```mermaid
sequenceDiagram
    participant U as User
    participant LT as LiveToolTest.tsx
    participant API as /api/tool-test
    participant EXT as External API

    U->>LT: Fill input fields → click "Run live test"
    LT->>API: POST { tool, args, credentials }
    API->>API: getUser() → 401 if not signed in
    API->>API: coerceArgs() — string→string, "123"→number, "true"→boolean
    API->>API: buildUrl(template, { ...args, ...credentials })
    Note right of API: {placeholder} replaced in path
    Note right of API: query params encoded, empty optionals dropped
    API->>API: validateUrl()
    Note right of API: must be http/https
    Note right of API: no path traversal (/../)
    Note right of API: no SSRF — private IPs blocked
    API->>API: build headers
    Note right of API: Content-Type, User-Agent: MCPBuilder/1.0
    Note right of API: Authorization: Bearer / X-API-Key / Basic
    Note right of API: Notion-Version / X-GitHub-Api-Version if needed
    API->>EXT: fetch(url, { method, headers, body? }) — 10s timeout
    EXT-->>API: HTTP response
    alt res.ok
        API->>API: try JSON.parse → pretty print
        API->>API: fallback: raw text → fallback: "(empty response)"
        API-->>LT: { success: true, output, status, durationMs }
    else !res.ok
        API-->>LT: { success: false, error, status, body, durationMs }
    end
    LT-->>U: Green/red result panel with response body
```

---

## 8. AI Chat Flow

```mermaid
sequenceDiagram
    participant U as User
    participant TC as TestChat.tsx
    participant API as /api/chat
    participant ANT as Anthropic API
    participant EXT as External API

    U->>TC: Type message → send
    TC->>API: POST { messages[], server: McpServer, credentials }
    API->>API: getUser() → 401 if not signed in
    API->>API: checkRateLimit(ip) → 429 if >15 req/min
    alt No ANTHROPIC_API_KEY
        API-->>TC: { isSimulation: true, content: "..." }
        TC-->>U: Show "Simulation mode" badge
    else Has API key
        API->>API: build aiTools from server.tools
        Note right of API: each tool → Zod schema + execute()
        API->>ANT: generateText({ model, system, messages, tools, maxSteps:5 })
        ANT->>ANT: decide which tool to call
        ANT->>API: tool call: shopify_list_orders({ limit: 5 })
        API->>API: executeTool() — same URL/header logic as tool-test
        API->>EXT: fetch real API
        EXT-->>API: JSON response
        API-->>ANT: tool result
        ANT->>ANT: format response in plain English
        ANT-->>API: final text
        API-->>TC: { content: "Here are your last 5 orders..." }
        TC-->>U: Assistant message rendered
    end
```

---

## 9. Code Generation Flow

Code generation runs **entirely client-side** — no server involved.

```
User opens Export tab → ExportPanel.tsx
              │
              ▼
lib/codegen.ts (runs in browser)
  ┌──────────────────────────────────────────────────────────┐
  │  generateServerCode(server, credentials)                 │
  │  ├─ for each McpTool:                                    │
  │  │    genZodSchema(inputs)                               │
  │  │    → z.object({ city: z.string().describe("...") })  │
  │  │    genFetchCall(tool, credentials)                    │
  │  │    ├─ bake config values into URL (shop_domain etc.)  │
  │  │    │   using split/join — not RegExp (avoids inject.) │
  │  │    ├─ convert {placeholders} → ${args.x} literals     │
  │  │    └─ build fetch() with headers + 10s timeout        │
  │  └─ → complete server.js as a string                     │
  ├──────────────────────────────────────────────────────────┤
  │  generateClaudeConfig()   → claude_desktop_config.json  │
  │  generateServerPackageJson() → package.json             │
  │  generateInstallScriptUnix()  → install.sh (bash)       │
  │  generateInstallScriptWindows() → install.ps1 (PS)      │
  └──────────────────────────────────────────────────────────┘
              │
              ▼
ExportPanel renders each file in a <pre> block
  ├─ Copy button → clipboard
  ├─ Download button → Blob download
  └─ "Download All" → downloads server.js + config + package.json
```

---

## 10. Undo / Redo Flow

```
builder/page.tsx maintains two stacks (max 50 steps each):
  undoStack: McpTool[][]
  redoStack: McpTool[][]

  pushUndo(currentTools)             undo()
  ├─ append snapshot to undoStack    ├─ pop from undoStack → tools
  └─ clear redoStack                 ├─ push server.tools → redoStack
                                     └─ updateServer({ tools })

  redo()
  ├─ pop from redoStack → tools
  ├─ push server.tools → undoStack
  └─ updateServer({ tools })

  Keyboard shortcuts (window event listener):
  Ctrl + Z          → undo()
  Ctrl + Shift + Z  → redo()
  ?                 → toggle shortcuts help (ignored inside inputs)
  Escape            → close modals
```

---

## 11. Database Schema

```
mcp_servers
├── id           TEXT          PRIMARY KEY
├── user_id      TEXT NOT NULL ← indexed (mcp_servers_user_id_idx)
├── name         TEXT NOT NULL
├── description  TEXT NOT NULL DEFAULT ''
├── tools        JSONB NOT NULL DEFAULT '[]'
├── created_at   TIMESTAMP NOT NULL DEFAULT now()
└── updated_at   TIMESTAMP NOT NULL DEFAULT now()

Note: credentials are intentionally NOT stored in the database.
      They live only in the browser, AES-GCM encrypted in localStorage.
```

---

## 12. API Endpoints

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| GET | `/api/servers` | Required | — | List all servers for the logged-in user |
| POST | `/api/servers` | Required | 60/min per user | Upsert a server definition |
| DELETE | `/api/servers/{id}` | Required | — | Delete a server (checks ownership) |
| POST | `/api/chat` | Required | 15/min per IP | AI Chat — proxies to Anthropic + executes tools |
| POST | `/api/tool-test` | Required | — | Live test — proxies one tool call to real API |

---

## 13. End-to-End Example: "Show me my last 5 orders"

```
1. User types "Show me my last 5 orders" in AI Chat tab
   TestChat.tsx → POST /api/chat
   { messages: [{role:"user", content:"Show me my last 5 orders"}],
     server: { tools: [shopify_list_orders, ...] },
     credentials: { token: "shpat_xxx", shop_domain: "mystore.myshopify.com" } }

2. /api/chat validates session → passes rate limit → builds tool objects
   shopify_list_orders = CoreTool {
     description: "List recent orders...",
     parameters: z.object({ status: z.enum([...]).optional(), limit: z.number().optional() }),
     execute: async ({ limit }) => executeTool(tool, { limit }, credentials)
   }

3. generateText() calls Anthropic claude-haiku-4-5
   Claude decides → call shopify_list_orders({ limit: 5 })

4. executeTool() fires:
   URL  → https://mystore.myshopify.com/admin/api/2025-01/orders.json?limit=5
   Headers → X-Shopify-Access-Token: shpat_xxx
             Content-Type: application/json
             User-Agent: MCPBuilder/1.0

5. Shopify responds → { orders: [{ id, name, total_price, ... }, ...] }

6. Tool result returned to Claude
   Claude formats: "Here are your last 5 orders:
                   1. #1234 — $149.99 — Fulfilled
                   2. #1233 — $89.00 — Pending..."

7. /api/chat returns { content: "Here are your last 5 orders:..." }
   TestChat.tsx renders as assistant message
```
