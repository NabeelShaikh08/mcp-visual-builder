import { NextRequest, NextResponse } from 'next/server'
import type { McpServer, McpTool } from '@/types'
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText, tool, type CoreTool } from 'ai'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// In-memory rate limiter: 15 requests per minute per IP
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()

  // Evict expired entries every ~100 calls to prevent unbounded memory growth
  if (rateLimits.size > 500) {
    for (const [key, val] of rateLimits) {
      if (now > val.resetAt) rateLimits.delete(key)
    }
  }

  const limit = rateLimits.get(ip)
  if (!limit || now > limit.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (limit.count >= 15) return false
  limit.count++
  return true
}

// Build a Zod schema for a tool's inputs
function buildZodSchema(inputs: McpTool['inputs']): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const inp of inputs) {
    let schema: z.ZodTypeAny
    switch (inp.type) {
      case 'number':
        schema = z.number().describe(inp.description)
        break
      case 'boolean':
        schema = z.boolean().describe(inp.description)
        break
      case 'enum':
        if (inp.enumValues && inp.enumValues.length > 0) {
          schema = z.enum(inp.enumValues as [string, ...string[]]).describe(inp.description)
        } else {
          schema = z.string().describe(inp.description)
        }
        break
      default:
        schema = z.string().describe(inp.description)
    }
    shape[inp.name] = inp.required ? schema : schema.optional()
  }
  return z.object(shape)
}

function buildUrl(template: string, args: Record<string, unknown>): string {
  const qIdx = template.indexOf('?')
  if (qIdx === -1) {
    return template.replace(/\{([^}]+)\}/g, (match, key: string) => {
      const v = args[key]
      return v !== undefined ? encodeURIComponent(String(v)) : match
    })
  }
  const pathPart = template.slice(0, qIdx)
  const queryPart = template.slice(qIdx + 1)
  const resolvedPath = pathPart.replace(/\{([^}]+)\}/g, (match, key: string) => {
    const v = args[key]
    return v !== undefined ? encodeURIComponent(String(v)) : match
  })
  const resolvedQuery = queryPart
    .split('&')
    .map((pair) => {
      const eqIdx = pair.indexOf('=')
      if (eqIdx === -1) return pair
      const paramName = pair.slice(0, eqIdx)
      const paramValue = pair.slice(eqIdx + 1)
      const placeholderMatch = paramValue.match(/^\{([^}]+)\}$/)
      if (placeholderMatch) {
        const key = placeholderMatch[1]
        const v = args[key]
        if (v === undefined || v === null || v === '') return null
        return `${paramName}=${encodeURIComponent(String(v))}`
      }
      return pair
    })
    .filter((p): p is string => p !== null)
    .join('&')
  return resolvedQuery ? `${resolvedPath}?${resolvedQuery}` : resolvedPath
}

function isPrivateHost(host: string): boolean {
  if (host === 'localhost' || host === '::1') return true
  if (/^127\.\d+\.\d+\.\d+$/.test(host)) return true
  if (/^169\.254\.\d+\.\d+$/.test(host)) return true
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true
  const classB = host.match(/^172\.(\d+)\.\d+\.\d+$/)
  if (classB && parseInt(classB[1]) >= 16 && parseInt(classB[1]) <= 31) return true
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true
  if (host.startsWith('fc') || host.startsWith('fd')) return true
  if (host === '[::1]') return true
  return false
}

// Execute a tool call against the actual API
async function executeTool(
  mcpTool: McpTool,
  args: Record<string, unknown>,
  credentials: Record<string, string>
): Promise<string> {
  const allArgs = { ...args, ...credentials }

  // Substitute {placeholders} in URL — encodes query values, drops empty optional params
  const resolvedUrl = buildUrl(mcpTool.connector.url, allArgs)

  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(resolvedUrl)
  } catch {
    return JSON.stringify({ error: `Invalid URL: ${resolvedUrl}` })
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return JSON.stringify({ error: 'Only http/https URLs are allowed' })
  }

  const decoded = decodeURIComponent(parsedUrl.pathname)
  if (decoded.includes('/../') || decoded.endsWith('/..')) {
    return JSON.stringify({ error: 'Path traversal detected' })
  }

  const host = parsedUrl.hostname.toLowerCase()
  if (isPrivateHost(host)) {
    return JSON.stringify({ error: 'Requests to internal addresses are not allowed' })
  }

  // Build headers
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': 'MCPBuilder/1.0' }
  const { authType, authHeader } = mcpTool.connector

  if (authType === 'bearer') {
    const token = credentials['token'] ?? credentials['api_token'] ?? ''
    if (token) headers['Authorization'] = `Bearer ${token}`
    // Notion requires this header on every request
    if (mcpTool.connector.url.includes('api.notion.com')) {
      headers['Notion-Version'] = '2022-06-28'
    }
    // GitHub recommends these headers for all API requests
    if (mcpTool.connector.url.includes('api.github.com')) {
      headers['Accept'] = 'application/vnd.github+json'
      headers['X-GitHub-Api-Version'] = '2022-11-28'
    }
  } else if (authType === 'api-key' && authHeader) {
    const key = credentials['token'] ?? credentials['api_key'] ?? credentials['key'] ?? ''
    headers[authHeader] = key
  } else if (authType === 'basic') {
    const user = credentials['api_user'] ?? credentials['consumer_key'] ?? ''
    const pass = credentials['api_pass'] ?? credentials['consumer_secret'] ?? ''
    headers['Authorization'] = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
  }

  // Build body
  let body: string | undefined
  if (['POST', 'PUT', 'PATCH'].includes(mcpTool.connector.method)) {
    if (mcpTool.connector.bodyTemplate) {
      body = mcpTool.connector.bodyTemplate.replace(/\{([^}]+)\}/g, (_, key: string) => {
        const v = allArgs[key]
        return v !== undefined ? String(v) : ''
      })
    } else {
      body = JSON.stringify(args)
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await fetch(resolvedUrl, {
      method: mcpTool.connector.method,
      headers,
      body,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const text = await res.text()
    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { parsed = text }

    return JSON.stringify({ status: res.status, data: parsed })
  } catch (err) {
    clearTimeout(timeout)
    const name = err instanceof Error ? err.name : ''
    if (name === 'AbortError') return JSON.stringify({ error: 'Request timed out after 10s' })
    return JSON.stringify({ error: err instanceof Error ? err.message : 'Fetch failed' })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded — 15 requests per minute.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const body = await req.json()
    const { messages, server, credentials = {} } = body as {
      messages: { role: string; content: string }[]
      server: McpServer
      credentials?: Record<string, string>
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // Simulation mode — no API key
      const toolNames = server.tools.map((t) => t.name).join(', ')
      return NextResponse.json({
        isSimulation: true,
        content: `No ANTHROPIC_API_KEY set. Add it to .env.local to enable real Claude tool calls.\n\nIn simulation mode I can tell you: I would use one of these tools to answer — ${toolNames || 'none defined yet'}.`,
      })
    }

    const anthropic = createAnthropic({ apiKey })

    // Build AI SDK tools from MCP tool definitions
    const aiTools: Record<string, CoreTool> = {}
    for (const mcpTool of server.tools) {
      const schema = buildZodSchema(mcpTool.inputs)
      aiTools[mcpTool.name] = tool({
        description: mcpTool.description,
        parameters: schema,
        execute: async (args) => {
          return executeTool(mcpTool, args as Record<string, unknown>, credentials)
        },
      })
    }

    const systemPrompt = `You are a helpful assistant testing an MCP server called "${server.name}".${server.description ? ` ${server.description}` : ''}

You have access to real API tools. When the user asks something that requires information from an external API, call the appropriate tool. Present results in a clear, readable format. If a tool call fails, explain the error concisely.`

    const result = await generateText({
      model: anthropic('claude-haiku-4-5'),
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      })),
      tools: Object.keys(aiTools).length > 0 ? aiTools : undefined,
      maxSteps: 5,
    })

    return NextResponse.json({ content: result.text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
