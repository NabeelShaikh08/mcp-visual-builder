'use client'

import { useState } from 'react'
import type { McpServer, McpTool } from '@/types'
import { generateId } from '@/lib/utils'
import ToolForm from '@/components/ToolForm'
import ToolList from '@/components/ToolList'
import TestChat from '@/components/TestChat'
import ExportPanel from '@/components/ExportPanel'
import { Zap, Code2, TestTube2, Rocket, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type Tab = 'build' | 'test' | 'export'

const EMPTY_SERVER: McpServer = {
  id: generateId(),
  name: 'my-mcp-server',
  description: 'My custom MCP server',
  tools: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export default function BuilderPage() {
  const [server, setServer] = useState<McpServer>(EMPTY_SERVER)
  const [activeTab, setActiveTab] = useState<Tab>('build')
  const [editingTool, setEditingTool] = useState<McpTool | null>(null)
  const [showForm, setShowForm] = useState(false)

  function updateServer(patch: Partial<McpServer>) {
    setServer((s) => ({ ...s, ...patch, updatedAt: new Date().toISOString() }))
  }

  function saveTool(tool: McpTool) {
    setServer((s) => {
      const exists = s.tools.find((t) => t.id === tool.id)
      const tools = exists
        ? s.tools.map((t) => (t.id === tool.id ? tool : t))
        : [...s.tools, tool]
      return { ...s, tools, updatedAt: new Date().toISOString() }
    })
    setEditingTool(null)
    setShowForm(false)
  }

  function deleteTool(id: string) {
    setServer((s) => ({
      ...s,
      tools: s.tools.filter((t) => t.id !== id),
      updatedAt: new Date().toISOString(),
    }))
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'build', label: 'Build', icon: <Code2 className="w-4 h-4" /> },
    { id: 'test', label: 'Test', icon: <TestTube2 className="w-4 h-4" /> },
    { id: 'export', label: 'Export', icon: <Rocket className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium">MCP Builder</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-white/30" />
          <span className="text-sm text-white/80">Builder</span>
        </div>

        {/* Server name */}
        <input
          value={server.name}
          onChange={(e) => updateServer({ name: e.target.value })}
          className="bg-white/5 border border-white/10 rounded px-3 py-1 text-sm text-center w-48 focus:outline-none focus:border-blue-500 transition-colors"
          placeholder="server-name"
        />

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'build' && (
          <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Server description */}
            <div className="mb-8">
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
                Server Description
              </label>
              <input
                value={server.description}
                onChange={(e) => updateServer({ description: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Describe what your MCP server does..."
              />
            </div>

            {/* Tools section */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-lg">Tools</h2>
                <p className="text-white/40 text-sm">
                  {server.tools.length === 0
                    ? 'No tools yet — add your first tool below'
                    : `${server.tools.length} tool${server.tools.length !== 1 ? 's' : ''} defined`}
                </p>
              </div>
              <button
                onClick={() => { setEditingTool(null); setShowForm(true) }}
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                + Add Tool
              </button>
            </div>

            <ToolList
              tools={server.tools}
              onEdit={(tool) => { setEditingTool(tool); setShowForm(true) }}
              onDelete={deleteTool}
            />

            {showForm && (
              <div className="mt-6">
                <ToolForm
                  initial={editingTool}
                  onSave={saveTool}
                  onCancel={() => { setShowForm(false); setEditingTool(null) }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'test' && (
          <TestChat server={server} />
        )}

        {activeTab === 'export' && (
          <ExportPanel server={server} />
        )}
      </main>
    </div>
  )
}
