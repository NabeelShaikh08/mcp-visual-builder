'use client'

import type { McpTool } from '@/types'
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface Props {
  tools: McpTool[]
  onEdit: (tool: McpTool) => void
  onDelete: (id: string) => void
}

export default function ToolList({ tools, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (tools.length === 0) {
    return (
      <div className="border border-dashed border-white/10 rounded-xl p-12 text-center text-white/30">
        No tools defined yet. Click &quot;Add Tool&quot; to get started.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tools.map((tool) => (
        <div key={tool.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-blue-400 text-sm bg-blue-500/10 px-2 py-0.5 rounded">
                {tool.name || 'unnamed_tool'}
              </span>
              <span className="text-white/60 text-sm truncate max-w-xs">{tool.description}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30">
                {tool.inputs.length} input{tool.inputs.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => onEdit(tool)}
                className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="Edit tool"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(tool.id)}
                className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                title="Delete tool"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setExpanded(expanded === tool.id ? null : tool.id)}
                className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                {expanded === tool.id
                  ? <ChevronUp className="w-3.5 h-3.5" />
                  : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {expanded === tool.id && (
            <div className="border-t border-white/10 px-5 py-4 space-y-3 text-sm">
              <div>
                <span className="text-white/30 text-xs uppercase tracking-wider">API</span>
                <p className="mt-1 font-mono text-white/70">
                  {tool.connector.method} {tool.connector.url}
                </p>
              </div>
              {tool.inputs.length > 0 && (
                <div>
                  <span className="text-white/30 text-xs uppercase tracking-wider">Inputs</span>
                  <div className="mt-2 space-y-1">
                    {tool.inputs.map((inp) => (
                      <div key={inp.id} className="flex items-center gap-2 text-white/60">
                        <span className="font-mono text-xs text-blue-300">{inp.name}</span>
                        <span className="text-white/30">·</span>
                        <span className="text-xs">{inp.type}</span>
                        {inp.required && (
                          <span className="text-xs text-red-400">required</span>
                        )}
                        <span className="text-white/30">—</span>
                        <span className="text-xs">{inp.description}</span>
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
