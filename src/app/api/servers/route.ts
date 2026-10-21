import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { mcpServers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { McpTool } from '@/types'

// Simple per-user rate limiter for write operations: 60 writes per minute
const writeLimits = new Map<string, { count: number; resetAt: number }>()

function checkWriteLimit(userId: string): boolean {
  const now = Date.now()
  if (writeLimits.size > 1000) {
    for (const [k, v] of writeLimits) { if (now > v.resetAt) writeLimits.delete(k) }
  }
  const limit = writeLimits.get(userId)
  if (!limit || now > limit.resetAt) {
    writeLimits.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (limit.count >= 60) return false
  limit.count++
  return true
}

function isValidTool(t: unknown): t is McpTool {
  if (!t || typeof t !== 'object') return false
  const tool = t as Record<string, unknown>
  return (
    typeof tool.id === 'string' &&
    typeof tool.name === 'string' &&
    typeof tool.description === 'string' &&
    Array.isArray(tool.inputs) &&
    tool.connector !== null &&
    typeof tool.connector === 'object'
  )
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select().from(mcpServers).where(eq(mcpServers.userId, user.id))
  return NextResponse.json({ servers: rows.map(rowToServer) })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!checkWriteLimit(user.id)) {
    return NextResponse.json(
      { error: 'Too many requests — slow down.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  const body = await req.json() as { id: string; name: string; description: string; tools: McpTool[]; createdAt: string; updatedAt: string }

  if (!body.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }
  if (!body.name || typeof body.name !== 'string' || body.name.length > 200) {
    return NextResponse.json({ error: 'name is required and must be under 200 characters' }, { status: 400 })
  }
  if (typeof body.description !== 'string' || body.description.length > 1000) {
    return NextResponse.json({ error: 'description must be under 1000 characters' }, { status: 400 })
  }
  if (!Array.isArray(body.tools) || body.tools.length > 100) {
    return NextResponse.json({ error: 'tools must be an array of up to 100 items' }, { status: 400 })
  }
  const invalidTool = body.tools.find((t) => !isValidTool(t))
  if (invalidTool !== undefined) {
    return NextResponse.json({ error: 'One or more tools have an invalid structure' }, { status: 400 })
  }

  await db.insert(mcpServers).values({
    id: body.id,
    userId: user.id,
    name: body.name,
    description: body.description,
    tools: body.tools,
    createdAt: new Date(body.createdAt),
    updatedAt: new Date(body.updatedAt),
  }).onConflictDoUpdate({
    target: mcpServers.id,
    set: {
      name: body.name,
      description: body.description,
      tools: body.tools,
      updatedAt: new Date(body.updatedAt),
    },
  })

  return NextResponse.json({ ok: true })
}

function rowToServer(row: typeof mcpServers.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tools: row.tools as McpTool[],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
