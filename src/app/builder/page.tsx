'use client'

import { useState, useEffect, useRef } from 'react'
import type { McpServer, McpTool, ToolPack } from '@/types'
import { generateId } from '@/lib/utils'
import { encryptCredentials, decryptCredentials } from '@/lib/crypto'
import { useAuth } from '@/hooks/useAuth'
import { useServers } from '@/hooks/useServers'
import ToolForm from '@/components/ToolForm'
import ToolList from '@/components/ToolList'
import TestChat from '@/components/TestChat'
import ExportPanel from '@/components/ExportPanel'
import TemplateLibrary from '@/components/TemplateLibrary'
import PackInstaller from '@/components/PackInstaller'
import LiveToolTest from '@/components/LiveToolTest'
import {
  Zap, Layers, FlaskConical, Download, ChevronRight,
  LayoutGrid, Beaker, X, Undo2, Redo2, Upload, Cloud, Loader2, LogOut,
} from 'lucide-react'
import Link from 'next/link'

type Tab = 'build' | 'live' | 'test' | 'export'

const CREDS_KEY = 'mcp-builder-credentials-v2'

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

function saveToStorage(key: string, value: unknown, onQuotaExceeded?: () => void) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { onQuotaExceeded?.() }
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'build',  label: 'Build',     icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'live',   label: 'Live Test', icon: <Beaker className="w-3.5 h-3.5" /> },
  { id: 'test',   label: 'AI Chat',   icon: <FlaskConical className="w-3.5 h-3.5" /> },
  { id: 'export', label: 'Export',    icon: <Download className="w-3.5 h-3.5" /> },
]

export default function BuilderPage() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth()
  const { servers: cloudServers, syncing, syncError, updateServers, deleteServerFromCloud } = useServers(user)

  const [servers, setServers] = useState<McpServer[]>([])
  const [allCredentials, setAllCredentials] = useState<Record<string, Record<string, string>>>({})
  const [activeServerId, setActiveServerId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<Tab>('build')
  const [editingTool, setEditingTool] = useState<McpTool | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [packToInstall, setPackToInstall] = useState<ToolPack | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [storageWarning, setStorageWarning] = useState(false)
  const [undoStack, setUndoStack] = useState<McpTool[][]>([])
  const [redoStack, setRedoStack] = useState<McpTool[][]>([])
  const importInputRef = useRef<HTMLInputElement>(null)

  // Sync cloud servers into local state when they arrive
  useEffect(() => {
    if (cloudServers.length > 0) {
      setServers(cloudServers)
      if (!activeServerId) setActiveServerId(cloudServers[0].id)
    }
  }, [cloudServers])

  // Initial hydration from localStorage
  useEffect(() => {
    const savedServers = (() => {
      try {
        const raw = localStorage.getItem('mcp-builder-servers-v2')
        return raw ? (JSON.parse(raw) as McpServer[]) : []
      } catch { return [] }
    })()

    if (savedServers.length > 0 && cloudServers.length === 0) {
      setServers(savedServers)
      setActiveServerId(savedServers[0].id)
    } else if (savedServers.length === 0 && cloudServers.length === 0) {
      const fresh = makeEmptyServer()
      setServers([fresh])
      setActiveServerId(fresh.id)
    }

    // Load credentials
    const rawCreds = localStorage.getItem(CREDS_KEY)
    if (rawCreds) {
      decryptCredentials(rawCreds)
        .then((data) => {
          if (data && typeof data === 'object') {
            setAllCredentials(data as Record<string, Record<string, string>>)
          }
        })
        .catch(() => {
          try {
            const plain = JSON.parse(rawCreds) as Record<string, Record<string, string>>
            setAllCredentials(plain)
          } catch { /* ignore */ }
        })
    }
    setHydrated(true)
  }, [])

  // Persist servers to localStorage
  useEffect(() => {
    if (hydrated && servers.length > 0) {
      saveToStorage('mcp-builder-servers-v2', servers, () => setStorageWarning(true))
    }
  }, [servers, hydrated])

  // Persist credentials encrypted
  useEffect(() => {
    if (!hydrated) return
    encryptCredentials(allCredentials)
      .then((encrypted) => {
        try { localStorage.setItem(CREDS_KEY, encrypted) } catch { setStorageWarning(true) }
      })
      .catch(() => saveToStorage(CREDS_KEY, allCredentials, () => setStorageWarning(true)))
  }, [allCredentials, hydrated])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.shiftKey && e.key === 'z') { e.preventDefault(); redo() }
      else if (mod && e.key === 'z') { e.preventDefault(); undo() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  const server = servers.find((s) => s.id === activeServerId) ?? servers[0]
  const credentials = server ? (allCredentials[server.id] ?? {}) : {}

  function updateServer(patch: Partial<McpServer>) {
    const updated = servers.map((s) =>
      s.id === activeServerId
        ? { ...s, ...patch, updatedAt: new Date().toISOString() }
        : s
    )
    setServers(updated)
    updateServers(updated)
  }

  function pushUndo(currentTools: McpTool[]) {
    setUndoStack((prev) => [...prev.slice(-49), currentTools])
    setRedoStack([])
  }

  function undo() {
    if (!server) return
    setUndoStack((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const tools = next.pop()!
      setRedoStack((r) => [...r, server.tools])
      updateServer({ tools })
      return next
    })
  }

  function redo() {
    if (!server) return
    setRedoStack((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const tools = next.pop()!
      setUndoStack((u) => [...u, server.tools])
      updateServer({ tools })
      return next
    })
  }

  function saveTool(tool: McpTool) {
    if (!server) return
    pushUndo(server.tools)
    const exists = server.tools.find((t) => t.id === tool.id)
    const tools = exists
      ? server.tools.map((t) => (t.id === tool.id ? tool : t))
      : [...server.tools, tool]
    updateServer({ tools })
    setEditingTool(null)
    setShowForm(false)
  }

  function deleteTool(id: string) {
    if (!server) return
    pushUndo(server.tools)
    updateServer({ tools: server.tools.filter((t) => t.id !== id) })
  }

  function addSingleTool(tool: McpTool) {
    if (!server) return
    updateServer({ tools: [...server.tools, tool] })
  }

  function installPack(tools: McpTool[], creds: Record<string, string>) {
    if (!server) return
    const existingNames = new Set(server.tools.map((t) => t.name))
    const newTools = tools.filter((t) => !existingNames.has(t.name))
    updateServer({ tools: [...server.tools, ...newTools] })
    setAllCredentials((prev) => ({
      ...prev,
      [server.id]: { ...(prev[server.id] ?? {}), ...creds },
    }))
  }

  function newServer() {
    const fresh = makeEmptyServer()
    const updated = [...servers, fresh]
    setServers(updated)
    updateServers(updated)
    setActiveServerId(fresh.id)
    setActiveTab('build')
    setShowForm(false)
    setEditingTool(null)
  }

  function deleteServer(id: string) {
    if (servers.length === 1) return
    const remaining = servers.filter((s) => s.id !== id)
    setServers(remaining)
    updateServers(remaining)
    deleteServerFromCloud(id)
    setAllCredentials((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    if (activeServerId === id) setActiveServerId(remaining[0].id)
  }

  function exportConfig() {
    if (!server) return
    const blob = new Blob(
      [JSON.stringify({ version: '1', exportedAt: new Date().toISOString(), servers: [server] }, null, 2)],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mcp-builder-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as { servers: McpServer[] }
        if (!data.servers || !Array.isArray(data.servers)) return alert('Invalid export file.')
        const existingIds = new Set(servers.map((s) => s.id))
        const incoming = data.servers.filter((s) => !existingIds.has(s.id))
        if (incoming.length === 0) return alert('No new servers to import.')
        const updated = [...servers, ...incoming]
        setServers(updated)
        updateServers(updated)
        setActiveServerId(incoming[0].id)
        alert(`Imported ${incoming.length} server${incoming.length !== 1 ? 's' : ''}.`)
      } catch { alert('Failed to parse import file.') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  if (!hydrated || !server) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Modals */}
      {showTemplates && (
        <TemplateLibrary
          onAdd={addSingleTool}
          onInstallPack={(pack) => { setPackToInstall(pack); setShowTemplates(false) }}
          onClose={() => setShowTemplates(false)}
        />
      )}
      {packToInstall && (
        <PackInstaller
          pack={packToInstall}
          onInstall={installPack}
          onClose={() => setPackToInstall(null)}
        />
      )}

      {/* Top bar */}
      <header className="border-b border-[#1a1a1a] h-12 px-5 flex items-center justify-between flex-shrink-0 bg-[#0a0a0a]">
        <div className="flex items-center gap-2 text-xs text-white/30">
          <Link href="/" className="flex items-center gap-1.5 hover:text-white/60 transition-colors">
            <div className="w-4 h-4 bg-white rounded-[3px] flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-black" fill="black" />
            </div>
            MCP Builder
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white/50">Builder</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={server.name}
            onChange={(e) => updateServer({ name: e.target.value })}
            className="bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] focus:border-[#444] rounded px-2.5 py-1 text-xs text-center w-44 focus:outline-none transition-colors text-white/80 focus:text-white"
            placeholder="server-name"
            suppressHydrationWarning
          />
          {/* Sync indicator */}
          {user && (
            syncing
              ? <Loader2 className="w-3 h-3 text-white/30 animate-spin" />
              : syncError
                ? <span title={syncError}><Cloud className="w-3 h-3 text-amber-400/60" /></span>
                : <span title="Synced"><Cloud className="w-3 h-3 text-emerald-400/60" /></span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-0.5 bg-[#111] border border-[#1a1a1a] rounded-lg p-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab.id ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Auth */}
          {!authLoading && (
            user ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/30 hidden sm:block">{user.email}</span>
                <button
                  onClick={signOut}
                  title="Sign out"
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link href="/login" className="text-[10px] text-white/30 hover:text-white/60 transition-colors border border-[#2a2a2a] hover:border-[#444] px-2.5 py-1 rounded">
                Sign in
              </Link>
            )
          )}
        </div>
      </header>

      {/* Storage warning */}
      {storageWarning && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2 flex items-center justify-between text-amber-400 text-xs">
          <span>Storage full — export your servers to avoid losing work.</span>
          <button onClick={() => setStorageWarning(false)} className="text-amber-400/60 hover:text-amber-400 transition-colors ml-4">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-48 border-r border-[#1a1a1a] flex flex-col shrink-0 bg-[#0a0a0a]">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1a1a1a]">
            <span className="text-[10px] font-medium uppercase tracking-widest text-white/25">Servers</span>
            <button
              onClick={newServer}
              className="text-[10px] text-white/30 hover:text-white/70 border border-[#2a2a2a] hover:border-[#444] rounded px-2 py-0.5 transition-colors"
            >
              + New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {servers.map((s) => (
              <button
                key={s.id}
                onClick={() => { setActiveServerId(s.id); setShowForm(false); setEditingTool(null) }}
                className={`w-full text-left px-3 py-2.5 transition-colors group relative ${
                  s.id === activeServerId
                    ? 'bg-white/[0.05] text-white border-r border-white/20'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
                }`}
              >
                <p className="text-xs font-medium truncate pr-4">{s.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[10px] text-white/25">
                    {s.tools.length} tool{s.tools.length !== 1 ? 's' : ''}
                  </p>
                  {allCredentials[s.id] && Object.keys(allCredentials[s.id]).length > 0 && (
                    <span className="text-[8px] text-emerald-400/50 border border-emerald-400/20 px-1 rounded-full">auth</span>
                  )}
                </div>
                {servers.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteServer(s.id) }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all text-xs"
                    title="Delete server"
                  >
                    ×
                  </button>
                )}
              </button>
            ))}
          </div>

          {/* Import/Export */}
          <div className="border-t border-[#1a1a1a] p-2 space-y-1">
            <button
              onClick={exportConfig}
              className="w-full flex items-center gap-2 text-[10px] text-white/30 hover:text-white/60 px-2 py-1.5 rounded hover:bg-white/[0.03] transition-colors"
            >
              <Download className="w-3 h-3" /> Export config
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="w-full flex items-center gap-2 text-[10px] text-white/30 hover:text-white/60 px-2 py-1.5 rounded hover:bg-white/[0.03] transition-colors"
            >
              <Upload className="w-3 h-3" /> Import config
            </button>
            <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">

          {/* BUILD TAB */}
          {activeTab === 'build' && (
            <div className="max-w-2xl mx-auto px-6 py-8">
              <div className="mb-7">
                <label className="block text-[10px] font-medium uppercase tracking-widest text-white/25 mb-1.5">
                  Server Description
                </label>
                <input
                  value={server.description}
                  onChange={(e) => updateServer({ description: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] focus:border-[#444] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-colors text-white/80 focus:text-white placeholder:text-white/25"
                  placeholder="Describe what your MCP server does..."
                  suppressHydrationWarning
                />
              </div>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold">Tools</h2>
                  <p className="text-xs text-white/30 mt-0.5">
                    {server.tools.length === 0
                      ? 'No tools yet'
                      : `${server.tools.length} tool${server.tools.length !== 1 ? 's' : ''} defined`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={undo}
                    disabled={undoStack.length === 0}
                    title="Undo (Ctrl+Z)"
                    className="p-1.5 text-white/30 hover:text-white/60 disabled:opacity-20 hover:bg-white/[0.04] rounded transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={redo}
                    disabled={redoStack.length === 0}
                    title="Redo (Ctrl+Shift+Z)"
                    className="p-1.5 text-white/30 hover:text-white/60 disabled:opacity-20 hover:bg-white/[0.04] rounded transition-colors"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowTemplates(true)}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 border border-[#2a2a2a] hover:border-[#444] px-3 py-1.5 rounded-md transition-colors"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Templates
                  </button>
                  <button
                    onClick={() => { setEditingTool(null); setShowForm(true) }}
                    className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-white/90 transition-colors"
                  >
                    + Add Tool
                  </button>
                </div>
              </div>

              <ToolList
                tools={server.tools}
                onEdit={(tool) => { setEditingTool(tool); setShowForm(true) }}
                onDelete={deleteTool}
              />

              {showForm && (
                <div className="mt-5">
                  <ToolForm
                    initial={editingTool}
                    existingTools={server.tools}
                    onSave={saveTool}
                    onCancel={() => { setShowForm(false); setEditingTool(null) }}
                  />
                </div>
              )}
            </div>
          )}

          {/* LIVE TEST TAB */}
          {activeTab === 'live' && (
            <div className="max-w-2xl mx-auto px-6 py-8">
              <div className="mb-7">
                <h2 className="text-sm font-semibold">Live API Test</h2>
                <p className="text-xs text-white/30 mt-1">
                  Calls your actual API endpoints with real inputs. Every response is real — no simulation.
                </p>
                {credentials.shop_domain && (
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-400/70 bg-emerald-500/[0.05] border border-emerald-500/15 rounded-lg px-3 py-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />
                    Connected to {credentials.shop_domain}
                  </div>
                )}
              </div>

              {server.tools.length === 0 ? (
                <div className="border border-dashed border-[#222] rounded-xl py-14 text-center">
                  <p className="text-xs text-white/25">No tools defined.</p>
                  <p className="text-[10px] text-white/15 mt-1">Go to Build and add tools first.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {server.tools.map((tool) => (
                    <LiveToolTest key={tool.id} tool={tool} credentials={credentials} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'test' && <TestChat server={server} credentials={credentials} />}
          {activeTab === 'export' && <ExportPanel server={server} credentials={credentials} />}
        </main>
      </div>
    </div>
  )
}
