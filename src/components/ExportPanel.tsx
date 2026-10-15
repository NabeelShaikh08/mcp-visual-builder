'use client'

import { useState } from 'react'
import type { McpServer } from '@/types'
import { generateServerCode, generateClaudeConfig, generateServerPackageJson } from '@/lib/codegen'
import { Copy, Download, Check, AlertCircle } from 'lucide-react'

interface Props {
  server: McpServer
}

type ExportTab = 'server' | 'config' | 'package'

export default function ExportPanel({ server }: Props) {
  const [activeTab, setActiveTab] = useState<ExportTab>('server')
  const [copied, setCopied] = useState(false)

  const noTools = server.tools.length === 0

  const files: Record<ExportTab, { label: string; filename: string; content: string }> = {
    server: {
      label: 'server.js',
      filename: 'server.js',
      content: generateServerCode(server),
    },
    config: {
      label: 'Claude Config',
      filename: 'claude_desktop_config.json',
      content: generateClaudeConfig(server),
    },
    package: {
      label: 'package.json',
      filename: 'package.json',
      content: generateServerPackageJson(server),
    },
  }

  function copy() {
    navigator.clipboard.writeText(files[activeTab].content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function download() {
    const { filename, content } = files[activeTab]
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadAll() {
    Object.values(files).forEach(({ filename, content }) => {
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-semibold text-lg">Export MCP Server</h2>
          <p className="text-white/40 text-sm">
            Download your generated server files and deploy to Claude Desktop.
          </p>
        </div>
        <button
          onClick={downloadAll}
          disabled={noTools}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download All
        </button>
      </div>

      {noTools && (
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-4 text-yellow-400 text-sm mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>No tools defined yet. Add tools in the Build tab first.</span>
        </div>
      )}

      {/* File tabs */}
      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 mb-4 w-fit">
        {(Object.entries(files) as [ExportTab, typeof files[ExportTab]][]).map(([key, file]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 rounded text-sm font-mono transition-colors ${
              activeTab === key ? 'bg-blue-600 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            {file.label}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="relative">
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-t-xl px-4 py-2">
          <span className="font-mono text-xs text-white/40">{files[activeTab].filename}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={copy}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={download}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        </div>
        <pre className="bg-slate-900 border border-t-0 border-white/10 rounded-b-xl p-5 overflow-x-auto text-xs text-white/70 font-mono leading-relaxed max-h-[500px] overflow-y-auto">
          {files[activeTab].content}
        </pre>
      </div>

      {/* Deploy instructions */}
      <div className="mt-8 space-y-4">
        <h3 className="font-semibold text-white/80">How to Deploy</h3>
        <div className="space-y-3 text-sm text-white/60">
          {[
            { step: '1', text: 'Download all 3 files into a new folder' },
            { step: '2', text: 'Run: npm install — to install @modelcontextprotocol/sdk and zod' },
            { step: '3', text: 'Set any env vars your tools need (API_TOKEN, API_KEY, etc.)' },
            {
              step: '4',
              text: `Paste the Claude config into: %APPDATA%\\Claude\\claude_desktop_config.json (Windows) or ~/Library/Application Support/Claude/claude_desktop_config.json (Mac)`,
            },
            { step: '5', text: 'Restart Claude Desktop — your tools will appear automatically' },
          ].map(({ step, text }) => (
            <div key={step} className="flex gap-3">
              <span className="w-6 h-6 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-mono">
                {step}
              </span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
