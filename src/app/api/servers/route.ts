import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { mcpServers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { McpTool } from '@/types'

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

  const body = await req.json() as { id: string; name: string; description: string; tools: McpTool[]; createdAt: string; updatedAt: string }

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
