'use client'

import { useState } from 'react'
import { TOOL_TEMPLATES, CATEGORIES, templateToTool, type ToolTemplate } from '@/lib/templates'
import { TOOL_PACKS } from '@/lib/packs'
import type { McpTool, ToolPack } from '@/types'
import { X, Zap, Search } from 'lucide-react'

interface Props {
  onAdd: (tool: McpTool) => void
  onInstallPack: (pack: ToolPack) => void
  onClose: () => void
}

type View = 'all' | string  // 'all' or a category name

export default function TemplateLibrary({ onAdd, onInstallPack, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState<View>('all')
  const [search, setSearch] = useState('')

  const query = search.trim().toLowerCase()

  const filtered = TOOL_TEMPLATES.filter((t) => {
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory
    if (!query) return matchesCategory
    const matchesSearch =
      t.label.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query) ||
      t.tool.name.toLowerCase().includes(query)
    return matchesCategory && matchesSearch
  })

  function handleAdd(template: ToolTemplate) {
    onAdd(templateToTool(template))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
          <div>
            <h2 className="text-sm font-semibold">Template Library</h2>
            <p className="text-xs text-white/30 mt-0.5">Pick a pack or individual tool to get started instantly</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Packs section */}
          <div className="px-6 py-4 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3 h-3 text-white/30" />
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/30">
                Integration Packs
              </span>
              <span className="text-[10px] text-white/15 border border-[#2a2a2a] px-1.5 py-0.5 rounded-full">
                {TOOL_PACKS.length} available
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {TOOL_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => { onInstallPack(pack); onClose() }}
                  className="text-left border border-[#222] hover:border-[#3a3a3a] rounded-xl p-4 bg-[#0d0d0d] hover:bg-[#141414] transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xl">{pack.icon}</span>
                    <div className="flex items-center gap-1">
                      {pack.authRequired && (
                        <span className="text-[9px] text-amber-400/60 border border-amber-400/20 px-1.5 py-0.5 rounded-full">
                          needs key
                        </span>
                      )}
                      <span className="text-[9px] text-white/20 border border-[#222] px-1.5 py-0.5 rounded-full">
                        {pack.tools.length} tools
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-semibold mb-1">{pack.name}</p>
                  <p className="text-[10px] text-white/35 leading-relaxed line-clamp-2">{pack.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Individual tools section */}
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/30">
                Individual Tools
              </span>
            </div>

            {/* Search input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-[#444] transition-colors text-white/70 placeholder:text-white/25"
              />
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
              {['all', ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
                    activeCategory === cat
                      ? 'bg-white text-black border-white'
                      : 'border-[#2a2a2a] text-white/40 hover:text-white/70 hover:border-[#444]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="text-xs text-white/25 py-4 text-center">
                No templates match &quot;{search}&quot;{activeCategory !== 'all' ? ` in ${activeCategory}` : ''}.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleAdd(template)}
                    className="text-left border border-[#222] hover:border-[#3a3a3a] rounded-xl p-4 bg-[#0d0d0d] hover:bg-[#141414] transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xl">{template.icon}</span>
                      <span className="text-[10px] text-white/20 border border-[#222] px-1.5 py-0.5 rounded-full">
                        {template.category}
                      </span>
                    </div>
                    <p className="text-xs font-semibold mb-1">{template.label}</p>
                    <p className="text-[10px] text-white/35 leading-relaxed line-clamp-2">{template.description}</p>
                    <p className="text-[10px] text-white/20 mt-2 font-mono">{template.tool.name}()</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
