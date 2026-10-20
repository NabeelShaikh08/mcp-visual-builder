// A single input parameter for an MCP tool
export interface ToolInput {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'enum'
  description: string
  required: boolean
  enumValues?: string[] // only used when type === 'enum'
}

// Auth methods supported for API calls
export type AuthType = 'none' | 'bearer' | 'api-key' | 'basic'

// HTTP methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// API connector config
export interface ApiConnector {
  method: HttpMethod
  url: string
  authType: AuthType
  authHeader?: string    // header name for api-key auth
  bodyTemplate?: string  // JSON template with {input.name} placeholders
}

// A complete MCP tool definition
export interface McpTool {
  id: string
  name: string           // snake_case, used as the tool identifier
  description: string    // shown to the AI — be descriptive
  inputs: ToolInput[]
  connector: ApiConnector
}

// The full MCP server definition
export interface McpServer {
  id: string
  name: string
  description: string
  tools: McpTool[]
  createdAt: string
  updatedAt: string
}

// Result of a tool test run
export interface TestResult {
  success: boolean
  toolName: string
  inputs: Record<string, unknown>
  output?: string
  error?: string
  durationMs: number
}

// A named credential stored per-server (e.g. Shopify API token)
export interface StoredCredential {
  key: string   // env var name, e.g. SHOPIFY_TOKEN
  value: string // actual value — stored in localStorage only, never exported
  label: string // human label e.g. "Shopify Admin API Token"
}

// A single credential field in a pack (e.g. API key, shop domain)
export interface CredentialField {
  key: string
  label: string
  placeholder: string
  secret?: boolean
}

// A curated pack of related tools (e.g. "Shopify Store Management")
export interface ToolPack {
  id: string
  name: string
  description: string
  icon: string
  category: string
  authRequired: boolean
  authLabel?: string        // e.g. "Shopify Admin API Token"
  authPlaceholder?: string  // e.g. "shpat_..."
  setupGuideUrl?: string
  tools: Omit<McpTool, 'id'>[]
}
