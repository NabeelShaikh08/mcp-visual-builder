'use client'

import { useState } from 'react'
import type { McpServer } from '@/types'
import {
  generateServerCode,
  generateClaudeConfig,
  generateServerPackageJson,
  generateInstallScriptUnix,
  generateInstallScriptWindows,
} from '@/lib/codegen'
import { Copy, Download, Check, AlertTriangle } from 'lucide-react'

interface Props {
  server: McpServer
}

type ExportTab = 'server' | 'config' | 'package' | 'install-mac' | 'install-win'

export default function ExportPanel({ server }: Props) {
  const [activeTab, setActiveTab] = useState<ExportTab>('server')
  const [copied, setCopied] = useState(false)

  const noTools = server.tools.length === 0

  // Derive a safe filename prefix from the server name
  const safeName =
    server.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'server'

  const files: Record<ExportTab, { label: string; filename: string; content: string }> = {
    server: { label: 'server.js', filename: `${safeName}-server.js`, content: generateServerCode(server) },
    config: { label: 'claude_desktop_config.json', filename: 'claude_desktop_config.json', content: generateClaudeConfig(server) },
    package: { label: 'package.json', filename: 'package.json', content: generateServerPackageJson(server) },
    'install-mac': { label: 'install.sh', filename: `${safeName}-install.sh`, content: generateInstallScriptUnix(server) },
    'install-win': { label: 'install.ps1', filename: `${safeName}-install.ps1`, content: generateInstallScriptWindows(server) },
  }

  function copy() {
    navigator.clipboard.writeText(files[activeTab].content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function download(tab?: ExportTab) {
    const { filename, content } = files[tab ?? activeTab]
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadCore() {
    (['server', 'config', 'package'] as ExportTab[]).forEach((k) => download(k))
  }

  const TAB_GROUPS = [
    { id: 'server' as ExportTab, label: 'server.js' },
    { id: 'config' as ExportTab, label: 'Claude Config' },
    { id: 'package' as ExportTab, label: 'package.json' },
    { id: 'install-mac' as ExportTab, label: 'install.sh' },
    { id: 'install-win' as ExportTab, label: 'install.ps1' },
  ]

  const deploySteps = [
    { os: 'Mac / Linux', steps: ['Download install.sh', 'Run: chmod +x install.sh && ./install.sh', 'Restart Claude Desktop'] },
    { os: 'Windows', steps: ['Download install.ps1', 'Right-click → Run with PowerShell', 'Restart Claude Desktop'] },
    { os: 'Manual', steps: ['Download server.js, package.json, claude_desktop_config.json into a new folder', 'Run: npm install', 'Paste claude_desktop_config.json content into your Claude config file', 'Restart Claude Desktop'] },
  ]

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-sm font-semibold">Export</h2>
          <p className="text-xs text-white/30 mt-0.5">Download your server files and deploy to Claude Desktop.</p>
        </div>
        <button
          onClick={downloadCore}
          disabled={noTools}
          className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-white/90 disabled:opacity-30 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download All
        </button>
      </div>

      {noTools && (
        <div className="flex items-start gap-3 bg-amber-500/[0.06] border border-amber-500/15 rounded-xl px-4 py-3.5 text-amber-400/80 text-xs mb-6">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Add tools in the Build tab first.
        </div>
      )}

      {/* File tabs */}
      <div className="flex items-center gap-0.5 bg-[#111] border border-[#222] rounded-lg p-0.5 mb-3 flex-wrap">
        {TAB_GROUPS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
              activeTab === id ? 'bg-white text-black' : 'text-white/35 hover:text-white/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="border border-[#222] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between bg-[#0d0d0d] px-4 py-2.5 border-b border-[#1a1a1a]">
          <span className="font-mono text-[10px] text-white/25">{files[activeTab].filename}</span>
          <div className="flex items-center gap-3">
            <button onClick={copy} className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors">
              {copied
                ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                : <><Copy className="w-3 h-3" />Copy</>}
            </button>
            <button onClick={() => download()} className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors">
              <Download className="w-3 h-3" />Download
            </button>
          </div>
        </div>
        <pre className="bg-[#080808] p-5 overflow-x-auto text-[11px] text-white/50 font-mono leading-relaxed max-h-[380px] overflow-y-auto">
          {files[activeTab].content}
        </pre>
      </div>

      {/* Deploy instructions */}
      <div className="mt-8 space-y-4">
        <h3 className="text-[10px] font-medium uppercase tracking-widest text-white/25">How to Deploy</h3>
        <div className="grid grid-cols-3 gap-3">
          {deploySteps.map(({ os, steps }) => (
            <div key={os} className="border border-[#1a1a1a] rounded-xl p-4 bg-[#0d0d0d]">
              <p className="text-xs font-semibold mb-3">{os}</p>
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="w-4 h-4 shrink-0 rounded-full border border-[#2a2a2a] flex items-center justify-center text-[9px] font-mono text-white/25 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[10px] text-white/35 leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
