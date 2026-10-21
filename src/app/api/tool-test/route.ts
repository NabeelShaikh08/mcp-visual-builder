import { NextRequest, NextResponse } from 'next/server'
import type { McpTool } from '@/types'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Coerce string form values to proper types based on the tool's input definitions
function coerceArgs(
  tool: McpTool,
  args: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(args)) {
    const inputDef = tool.inputs.find((inp) => inp.name === key)
    if (!inputDef) {
      result[key] = val
      continue
    }
    switch (inputDef.type) {
      case 'number': {
        const n = parseFloat(val)
        result[key] = isNaN(n) ? val : n
        break
      }
      case 'boolean':
        result[key] = val === 'true'
        break
      case 'string':
      case 'enum':
      default:
        result[key] = val
    }
  }
  return result
}

// Build the final URL by replacing {placeholder} segments with actual arg values.
// Values that appear inside query strings are percent-encoded to prevent injection.
function buildUrl(template: string, args: Record<string, unknown>): string {
  // Split into path and query so we can encode query values correctly
  const qIdx = template.indexOf('?')
  if (qIdx === -1) {
    // No query string — just substitute path placeholders (no encoding needed)
    return template.replace(/\{([^}]+)\}/g, (match, key: string) => {
      const v = args[key]
      return v !== undefined ? encodeURIComponent(String(v)) : match
    })
  }

  const pathPart = template.slice(0, qIdx)
  const queryPart = template.slice(qIdx + 1)

  // Substitute path placeholders (encode for safe URL paths)
  const resolvedPath = pathPart.replace(/\{([^}]+)\}/g, (match, key: string) => {
    const v = args[key]
    return v !== undefined ? encodeURIComponent(String(v)) : match
  })

  // Parse query params and substitute + encode values; drop params with unresolved placeholders
  const resolvedQuery = queryPart
    .split('&')
    .map((pair) => {
      const eqIdx = pair.indexOf('=')
      if (eqIdx === -1) return pair
      const paramName = pair.slice(0, eqIdx)
      const paramValue = pair.slice(eqIdx + 1)
      // If the value is a single placeholder, substitute it
      const placeholderMatch = paramValue.match(/^\{([^}]+)\}$/)
      if (placeholderMatch) {
        const key = placeholderMatch[1]
        const v = args[key]
        // Drop the param entirely if the value is missing (optional params)
        if (v === undefined || v === null || v === '') return null
        return `${paramName}=${encodeURIComponent(String(v))}`
      }
      return pair
    })
    .filter((p): p is string => p !== null)
    .join('&')

  return resolvedQuery ? `${resolvedPath}?${resolvedQuery}` : resolvedPath
}

// Validate URL — catch malformed URLs, path traversal, and SSRF targets
function validateUrl(
  resolvedUrl: string,
): { valid: true; url: URL } | { valid: false; error: string } {
  let parsed: URL
  try {
    parsed = new URL(resolvedUrl)
  } catch {
    return { valid: false, error: `Invalid URL: ${resolvedUrl}` }
  }

  // Only allow http and https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Invalid URL: only http and https are allowed' }
  }

  // Decode and check for path traversal
  const decoded = decodeURIComponent(parsed.pathname)
  if (decoded.includes('/../') || decoded.endsWith('/..')) {
    return { valid: false, error: 'Invalid URL: path traversal detected' }
  }

  // Block SSRF — deny requests to internal/private network addresses
  const host = parsed.hostname.toLowerCase()
  if (isPrivateHost(host)) {
    return { valid: false, error: 'Invalid URL: requests to internal addresses are not allowed' }
  }

  return { valid: true, url: parsed }
}

// Returns true if the hostname resolves to a private/internal address
function isPrivateHost(host: string): boolean {
  // Loopback
  if (host === 'localhost' || host === '::1') return true
  if (/^127\.\d+\.\d+\.\d+$/.test(host)) return true

  // Link-local (AWS/GCP metadata endpoint 169.254.169.254 lives here)
  if (/^169\.254\.\d+\.\d+$/.test(host)) return true

  // Private class A: 10.0.0.0/8
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true

  // Private class B: 172.16.0.0/12 (172.16.x.x – 172.31.x.x)
  const classB = host.match(/^172\.(\d+)\.\d+\.\d+$/)
  if (classB && parseInt(classB[1]) >= 16 && parseInt(classB[1]) <= 31) return true

  // Private class C: 192.168.0.0/16
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true

  // IPv6 private ranges (simplified check for common cases)
  if (host.startsWith('fc') || host.startsWith('fd')) return true
  if (host === '[::1]') return true

  return false
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as {
      tool: McpTool
      args: Record<string, string>
      credentials?: Record<string, string>
    }

    const { tool, credentials = {} } = body
    const rawArgs = body.args ?? {}

    if (!tool) {
      return NextResponse.json({ success: false, error: 'tool is required' }, { status: 400 })
    }

    // Coerce string args to proper types
    const args = coerceArgs(tool, rawArgs)

    // Inject credentials as args too (for URL placeholder substitution)
    const allArgs: Record<string, unknown> = { ...args, ...credentials }

    // Build URL
    const resolvedUrl = buildUrl(tool.connector.url, allArgs)

    // Validate the resolved URL
    const validation = validateUrl(resolvedUrl)
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 })
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'MCPBuilder/1.0',
    }

    if (tool.connector.authType === 'bearer') {
      const token = credentials['token'] ?? credentials['api_token'] ?? ''
      if (token) headers['Authorization'] = `Bearer ${token}`
      // Notion requires this header on every request
      if (tool.connector.url.includes('api.notion.com')) {
        headers['Notion-Version'] = '2022-06-28'
      }
      // GitHub recommends this header for all API requests
      if (tool.connector.url.includes('api.github.com')) {
        headers['Accept'] = 'application/vnd.github+json'
        headers['X-GitHub-Api-Version'] = '2022-11-28'
      }
    } else if (tool.connector.authType === 'api-key' && tool.connector.authHeader) {
      const key = credentials['token'] ?? credentials['api_key'] ?? credentials['key'] ?? ''
      headers[tool.connector.authHeader] = key
    } else if (tool.connector.authType === 'basic') {
      const user = credentials['api_user'] ?? credentials['consumer_key'] ?? ''
      const pass = credentials['api_pass'] ?? credentials['consumer_secret'] ?? ''
      headers['Authorization'] = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: tool.connector.method,
      headers,
    }

    if (['POST', 'PUT', 'PATCH'].includes(tool.connector.method)) {
      if (tool.connector.bodyTemplate) {
        const body = tool.connector.bodyTemplate.replace(/\{([^}]+)\}/g, (_, key: string) => {
          const v = allArgs[key]
          return v !== undefined ? String(v) : ''
        })
        fetchOptions.body = body
      } else {
        fetchOptions.body = JSON.stringify(args)
      }
    }

    const start = Date.now()

    // Fetch with AbortController timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    let res: Response
    try {
      res = await fetch(resolvedUrl, { ...fetchOptions, signal: controller.signal })
      clearTimeout(timeout)
    } catch (fetchErr) {
      clearTimeout(timeout)
      const errName = fetchErr instanceof Error ? fetchErr.name : ''
      if (errName === 'AbortError') {
        return NextResponse.json(
          { success: false, error: 'Request timed out after 10s' },
          { status: 504 }
        )
      }
      throw fetchErr
    }

    const durationMs = Date.now() - start

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return NextResponse.json({
        success: false,
        error: `API error: ${res.status} ${res.statusText}`,
        status: res.status,
        body: errText,
        durationMs,
      })
    }

    const text = await res.text().catch(() => '')
    let output: string
    try {
      output = JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      output = text || '(empty response)'
    }
    return NextResponse.json({
      success: true,
      output,
      status: res.status,
      durationMs,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
