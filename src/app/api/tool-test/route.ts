import { NextRequest, NextResponse } from 'next/server'
import type { McpTool } from '@/types'

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

// Build the final URL by replacing {placeholder} segments with actual arg values
function buildUrl(template: string, args: Record<string, unknown>): string {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const v = args[key]
    return v !== undefined ? String(v) : `{${key}}`
  })
}

// Validate URL — catch malformed URLs and path traversal attempts
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

  return { valid: true, url: parsed }
}

export async function POST(req: NextRequest) {
  try {
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
    }

    if (tool.connector.authType === 'bearer') {
      const token = credentials['token'] ?? credentials['api_token'] ?? ''
      headers['Authorization'] = `Bearer ${token}`
    } else if (tool.connector.authType === 'api-key' && tool.connector.authHeader) {
      const key = credentials['token'] ?? credentials['api_key'] ?? credentials['key'] ?? ''
      headers[tool.connector.authHeader] = key
    } else if (tool.connector.authType === 'basic') {
      const user = credentials['api_user'] ?? ''
      const pass = credentials['api_pass'] ?? ''
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

    const data = await res.json().catch(() => null)
    return NextResponse.json({
      success: true,
      output: JSON.stringify(data, null, 2),
      status: res.status,
      durationMs,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
