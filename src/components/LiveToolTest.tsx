'use client'

import { useState } from 'react'
import type { McpTool } from '@/types'
import { Play, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  tool: McpTool
  credentials?: Record<string, string>  // e.g. { shop_domain, token }
}

interface TestResult {
  success: boolean
  status: number
  durationMs: number
  output?: string
  error?: string
  body?: string
}

export default function LiveToolTest({ tool, credentials = {} }: Props) {
  const [args, setArgs] = useState<Record<string, string>>({})
  const [result, setResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)

  async function runTest() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/tool-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, args, credentials }),
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setResult({ success: false, status: 0, durationMs: 0, error: err instanceof Error ? err.message : String(err) })
    } finally {
      setLoading(false)
    }
  }

  const requiredFilled = tool.inputs.filter((i) => i.required).every((i) => args[i.name]?.trim())

  return (
    <div className="border border-[#1e1e1e] rounded-xl overflow-hidden bg-[#0d0d0d]">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#141414] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-white/60 px-2 py-0.5 rounded shrink-0">
            {tool.name}
          </span>
          <span className="text-xs text-white/30 truncate">{tool.description.split('.')[0]}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {result && (
            result.success
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              : <XCircle className="w-3.5 h-3.5 text-red-400" />
          )}
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-white/20" />
            : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#1a1a1a] px-4 py-4 space-y-4">
          {tool.inputs.length === 0 && (
            <p className="text-[10px] text-white/25">No inputs required — ready to run.</p>
          )}

          {tool.inputs.map((inp) => (
            <div key={inp.id}>
              <label className="block text-[10px] font-medium uppercase tracking-widest text-white/25 mb-1.5">
                {inp.name}
                {inp.required && <span className="text-red-400/70 ml-1">*</span>}
                <span className="normal-case tracking-normal text-white/15 ml-1.5 font-normal">
                  {inp.type} — {inp.description}
                </span>
              </label>
              {inp.type === 'enum' && inp.enumValues ? (
                <select
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#444] transition-colors text-white/80"
                  value={args[inp.name] ?? ''}
                  onChange={(e) => setArgs((a) => ({ ...a, [inp.name]: e.target.value }))}
                >
                  <option value="">Select...</option>
                  {inp.enumValues.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : inp.type === 'boolean' ? (
                <select
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#444] transition-colors text-white/80"
                  value={args[inp.name] ?? ''}
                  onChange={(e) => setArgs((a) => ({ ...a, [inp.name]: e.target.value }))}
                >
                  <option value="">Select...</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#444] transition-colors text-white/80 placeholder:text-white/20"
                  type={inp.type === 'number' ? 'number' : 'text'}
                  value={args[inp.name] ?? ''}
                  onChange={(e) => setArgs((a) => ({ ...a, [inp.name]: e.target.value }))}
                  placeholder={`Enter ${inp.name}...`}
                  suppressHydrationWarning
                />
              )}
            </div>
          ))}

          <button
            onClick={runTest}
            disabled={loading || !requiredFilled}
            className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-4 py-2 rounded-md hover:bg-white/90 disabled:opacity-30 transition-colors"
          >
            <Play className="w-3 h-3" fill="black" />
            {loading ? 'Running...' : 'Run live test'}
          </button>

          {result && (
            <div className={`rounded-lg border overflow-hidden ${
              result.success ? 'border-emerald-500/20' : 'border-red-500/20'
            }`}>
              <div className={`flex items-center justify-between px-3 py-2 text-[10px] ${
                result.success
                  ? 'bg-emerald-500/[0.05] text-emerald-400/70'
                  : 'bg-red-500/[0.05] text-red-400/70'
              }`}>
                <div className="flex items-center gap-1.5">
                  {result.success
                    ? <CheckCircle className="w-3 h-3" />
                    : <XCircle className="w-3 h-3" />}
                  {result.success ? 'Success' : 'Failed'}{result.status > 0 ? ` — HTTP ${result.status}` : ''}
                </div>
                {result.durationMs > 0 && (
                  <div className="flex items-center gap-1 text-white/20">
                    <Clock className="w-2.5 h-2.5" />
                    {result.durationMs}ms
                  </div>
                )}
              </div>
              {result.error && (
                <div className="px-3 py-2 bg-red-500/[0.04] border-b border-red-500/10">
                  <p className="text-[10px] text-red-400/70">{result.error}</p>
                </div>
              )}
              {result.body && (
                <pre className="bg-[#080808] px-4 pt-3 text-[10px] font-mono text-red-400/50 overflow-x-auto max-h-24 overflow-y-auto border-b border-red-500/10">
                  {result.body}
                </pre>
              )}
              <pre className="bg-[#080808] p-4 text-[11px] font-mono text-white/50 overflow-x-auto max-h-64 overflow-y-auto leading-relaxed">
                {result.output ?? 'No output'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
