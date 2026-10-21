'use client'

import type { McpTool } from '@/types'
import { Pencil, Trash2, ChevronDown, ChevronUp, Globe, Copy } from 'lucide-react'
import { useState } from 'react'

interface Props {
  tools: McpTool[]
  onEdit: (tool: McpTool) => void
  onDelete: (id: string) => void
  onDuplicate: (tool: McpTool) => void
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-blue-400',
  PUT: 'text-yellow-400',
  PATCH: 'text-orange-400',
  DELETE: 'text-red-400',
}

export default function ToolList({ tools, onEdit, onDelete, onDuplicate }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (tools.length === 0) {
    return (
      <div className="border border-dashed border-white/[0.08] rounded-xl py-14 text-center">
        <Globe className="w-6 h-6 mx-auto text-white/15 mb-3" />
        <p className="text-xs text-white/25">No tools defined yet.</p>
        <p className="text-xs text-white/15 mt-1">Click &quot;Add Tool&quot; to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tools.map((tool) => (
        <div
          key={tool.id}
          className="border border-white/[0.07] rounded-xl overflow-hidden bg-white/[0.02]"
        >
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-xs bg-white/[0.06] border border-white/[0.08] text-white/70 px-2 py-0.5 rounded shrink-0">
                {tool.name || 'unnamed'}
              </span>
              <span className="text-xs text-white/35 truncate">{tool.description}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-3">
              {tool.inputs.length > 0 && (
                <span className="text-[10px] text-white/20 mr-1">
                  {tool.inputs.length}p
                </span>
              )}
              <button
                onClick={() => onDuplicate(tool)}
                className="p-1.5 text-white/25 hover:text-white/70 hover:bg-white/[0.05] rounded transition-colors"
                title="Duplicate"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={() => onEdit(tool)}
                className="p-1.5 text-white/25 hover:text-white/70 hover:bg-white/[0.05] rounded transition-colors"
                title="Edit"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={() => onDelete(tool.id)}
                className="p-1.5 text-white/25 hover:text-red-400 hover:bg-red-500/[0.08] rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => setExpanded(expanded === tool.id ? null : tool.id)}
                className="p-1.5 text-white/25 hover:text-white/60 hover:bg-white/[0.05] rounded transition-colors"
              >
                {expanded === tool.id
                  ? <ChevronUp className="w-3 h-3" />
                  : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {expanded === tool.id && (
            <div className="border-t border-white/[0.06] px-4 py-4 space-y-3 bg-black/20">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/20 mb-1.5">Endpoint</p>
                <p className="font-mono text-xs text-white/50">
                  <span className={`font-bold mr-2 ${METHOD_COLORS[tool.connector.method] ?? 'text-white/50'}`}>
                    {tool.connector.method}
                  </span>
                  {tool.connector.url}
                </p>
              </div>
              {tool.inputs.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/20 mb-1.5">Parameters</p>
                  <div className="space-y-1">
                    {tool.inputs.map((inp) => (
                      <div key={inp.id} className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-white/60">{inp.name}</span>
                        <span className="text-white/20">·</span>
                        <span className="text-white/30">{inp.type}</span>
                        {inp.required && (
                          <span className="text-[10px] text-rose-400/70 border border-rose-400/20 px-1 rounded">req</span>
                        )}
                        <span className="text-white/20">—</span>
                        <span className="text-white/35">{inp.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
