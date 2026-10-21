'use client'
import { useEffect, useState, useRef } from 'react'
import type { McpServer } from '@/types'
import { generateId } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'

const SERVERS_KEY = 'mcp-builder-servers-v2'

function makeEmptyServer(): McpServer {
  return {
    id: generateId(),
    name: 'my-mcp-server',
    description: 'My custom MCP server',
    tools: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function loadLocal(): McpServer[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SERVERS_KEY)
    return raw ? (JSON.parse(raw) as McpServer[]) : []
  } catch { return [] }
}

function saveLocal(servers: McpServer[]) {
  try { localStorage.setItem(SERVERS_KEY, JSON.stringify(servers)) } catch { /* quota */ }
}

export function useServers(user: User | null) {
  const [servers, setServers] = useState<McpServer[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function syncServer(server: McpServer) {
    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSyncError(null)
    } catch {
      setSyncError('Sync failed — saved locally')
    }
  }

  async function deleteServerFromCloud(id: string) {
    try {
      const res = await fetch(`/api/servers/${id}`, { method: 'DELETE' })
      if (!res.ok) setSyncError('Delete sync failed — server may reappear on reload')
    } catch {
      setSyncError('Delete sync failed — server may reappear on reload')
    }
  }

  // Load servers on mount / user change
  useEffect(() => {
    if (user) {
      setSyncing(true)
      fetch('/api/servers')
        .then((r) => r.json())
        .then((data: { servers?: McpServer[] }) => {
          if (data.servers && data.servers.length > 0) {
            setServers(data.servers)
            saveLocal(data.servers)
            setSyncError(null)
          } else {
            const local = loadLocal()
            if (local.length > 0) {
              setServers(local)
              Promise.all(local.map((s) => syncServer(s))).catch(() => {})
            } else {
              const fresh = makeEmptyServer()
              setServers([fresh])
            }
          }
        })
        .catch(() => {
          const local = loadLocal()
          setServers(local.length > 0 ? local : [makeEmptyServer()])
          setSyncError('Offline — changes saved locally')
        })
        .finally(() => setSyncing(false))
    } else {
      const local = loadLocal()
      setServers(local.length > 0 ? local : [makeEmptyServer()])
      setSyncError(null)
    }
  }, [user?.id])

  function updateServers(updated: McpServer[]) {
    setServers(updated)
    saveLocal(updated)

    if (user) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        Promise.all(updated.map((s) => syncServer(s))).catch(() => {})
      }, 1000)
    }
  }

  return { servers, syncing, syncError, updateServers, deleteServerFromCloud }
}
