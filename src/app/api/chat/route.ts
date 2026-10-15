import { NextRequest, NextResponse } from 'next/server'
import type { McpServer, McpTool } from '@/types'

// Build the system prompt describing the available tools to Claude
function buildSystemPrompt(server: McpServer): string {
  if (server.tools.length === 0) {
    return 'You are a helpful assistant. No tools are available.'
  }

  const toolDescriptions = server.tools.map((tool: McpTool) => {
    const inputList = tool.inputs.map((inp) =>
      `  - ${inp.name} (${inp.type}${inp.required ? ', required' : ', optional'}): ${inp.description}`
    ).join('\n')

    return `Tool: ${tool.name}
Description: ${tool.description}
Inputs:
${inputList || '  (no inputs)'}
`
  }).join('\n---\n')

  return `You are a helpful assistant testing an MCP server called "${server.name}".
${server.description}

You have access to these tools:
${toolDescriptions}

When the user asks something that requires a tool, explain which tool you would call and what parameters you would use. Since this is a test environment, simulate the tool call by describing the request you would make and the expected response format.

Be concise and clear. Always show exactly which tool name and inputs you would use.`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, server } = body as {
      messages: { role: string; content: string }[]
      server: McpServer
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not set. Add it to your .env.local file.' },
        { status: 500 }
      )
    }

    const systemPrompt = buildSystemPrompt(server)

    // Call Anthropic API directly — no extra SDK needed in route
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.error?.message ?? `Anthropic API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.content?.[0]?.text ?? 'No response'

    return NextResponse.json({ content })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
