'use client'

import { useState } from 'react'
import type { ToolPack } from '@/types'
import { packToTools } from '@/lib/packs'
import type { McpTool } from '@/types'
import { generateId } from '@/lib/utils'
import { X, ExternalLink, ChevronDown, ChevronUp, ShieldCheck, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface Props {
  pack: ToolPack
  onInstall: (tools: McpTool[], credentials: Record<string, string>) => void
  onClose: () => void
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

const field = 'w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#444] transition-colors text-white/80 placeholder:text-white/25'
const label = 'block text-[10px] font-medium uppercase tracking-widest text-white/25 mb-1.5'
const errTxt = 'text-red-400 text-[10px] mt-1'

// Per-pack credential field definitions
type CredField = { key: string; label: string; placeholder: string; type?: 'password' | 'text'; hint?: string; validate?: (v: string) => string | null }

function getCredFields(pack: ToolPack): CredField[] {
  switch (pack.id) {
    case 'shopify':
      return [
        { key: 'shop_domain', label: 'Store Domain', placeholder: 'mystore.myshopify.com', type: 'text', hint: 'e.g. testing-abc123.myshopify.com' },
        { key: 'token', label: 'Admin API Token', placeholder: 'shpat_xxxxxxxxxxxxxxxxxxxx', type: 'password',
          validate: (v) => v && !v.startsWith('shpat_') ? 'Shopify Admin API tokens start with shpat_' : null },
      ]
    case 'woocommerce':
      return [
        { key: 'shop_domain', label: 'Store Domain', placeholder: 'mystore.com', type: 'text', hint: 'Without https://, e.g. mystore.com' },
        { key: 'consumer_key', label: 'Consumer Key', placeholder: 'ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'text',
          validate: (v) => v && !v.startsWith('ck_') ? 'WooCommerce consumer keys start with ck_' : null },
        { key: 'consumer_secret', label: 'Consumer Secret', placeholder: 'cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'password',
          validate: (v) => v && !v.startsWith('cs_') ? 'WooCommerce consumer secrets start with cs_' : null },
      ]
    case 'stripe':
      return [
        { key: 'token', label: 'Secret Key', placeholder: 'sk_test_...', type: 'password',
          validate: (v) => v && !v.startsWith('sk_') ? 'Stripe secret keys start with sk_test_ or sk_live_' : null },
      ]
    case 'github':
      return [
        { key: 'token', label: 'Personal Access Token (optional)', placeholder: 'ghp_...', type: 'password',
          hint: 'Skip this for public repos — only needed for private repos or higher rate limits.' },
      ]
    case 'notion':
      return [
        { key: 'token', label: 'Integration Token', placeholder: 'secret_...', type: 'password',
          validate: (v) => v && !v.startsWith('secret_') ? 'Notion integration tokens start with secret_' : null },
      ]
    case 'airtable':
      return [
        { key: 'token', label: 'Personal Access Token', placeholder: 'pat...', type: 'password',
          validate: (v) => v && !v.startsWith('pat') ? 'Airtable personal access tokens start with pat' : null },
      ]
    default:
      // Generic fallback — single token field
      return [
        { key: 'token', label: pack.authLabel ?? 'API Token', placeholder: pack.authPlaceholder ?? 'Enter your API token...', type: 'password' },
      ]
  }
}

// Setup guide blurbs per pack
function SetupBlurb({ pack }: { pack: ToolPack }) {
  if (pack.id === 'shopify') {
    return (
      <div className="bg-amber-500/[0.05] border border-amber-500/15 rounded-lg px-4 py-3">
        <p className="text-xs text-amber-400/80 leading-relaxed">
          You need a Shopify Admin API token. Go to your store →{' '}
          <span className="font-mono">Settings → Apps → Develop apps</span>{' '}
          → Create app → set permissions → Install → copy the token.
        </p>
        {pack.setupGuideUrl && (
          <a href={pack.setupGuideUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-amber-400/60 hover:text-amber-400 mt-2 transition-colors">
            <ExternalLink className="w-2.5 h-2.5" /> Official setup guide
          </a>
        )}
      </div>
    )
  }
  if (pack.id === 'woocommerce') {
    return (
      <div className="bg-purple-500/[0.05] border border-purple-500/15 rounded-lg px-4 py-3">
        <p className="text-xs text-purple-400/80 leading-relaxed">
          Generate API keys in your WordPress admin →{' '}
          <span className="font-mono">WooCommerce → Settings → Advanced → REST API</span>{' '}
          → Add key → set Read/Write access → Generate.
        </p>
      </div>
    )
  }
  if (pack.id === 'stripe') {
    return (
      <div className="bg-indigo-500/[0.05] border border-indigo-500/15 rounded-lg px-4 py-3">
        <p className="text-xs text-indigo-400/80 leading-relaxed">
          Find your keys in the{' '}
          <span className="font-mono">Stripe Dashboard → Developers → API keys</span>.
          Use a <strong>test key</strong> (sk_test_...) while developing.
        </p>
      </div>
    )
  }
  if (pack.id === 'github') {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3">
        <p className="text-xs text-white/40 leading-relaxed">
          Create a token at{' '}
          <span className="font-mono">GitHub → Settings → Developer settings → Personal access tokens</span>.
          Public repo access works without a token.
        </p>
      </div>
    )
  }
  if (pack.id === 'notion') {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3">
        <p className="text-xs text-white/40 leading-relaxed">
          Create an integration at{' '}
          <span className="font-mono">notion.so/my-integrations</span> then share
          each database with it using the{' '}
          <span className="font-mono">Connect to</span> menu.
        </p>
      </div>
    )
  }
  if (pack.id === 'airtable') {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3">
        <p className="text-xs text-white/40 leading-relaxed">
          Create a personal access token at{' '}
          <span className="font-mono">airtable.com/create/tokens</span>.
          Grant <span className="font-mono">data.records:read</span> and{' '}
          <span className="font-mono">schema.bases:read</span> scopes.
        </p>
      </div>
    )
  }
  return null
}

export default function PackInstaller({ pack, onInstall, onClose }: Props) {
  const credFields = getCredFields(pack)
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(credFields.map((f) => [f.key, '']))
  )
  const [showTools, setShowTools] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testError, setTestError] = useState('')

  function setValue(key: string, raw: string) {
    // Strip https:// for domain fields
    const val = key === 'shop_domain' ? raw.replace(/^https?:\/\//, '').replace(/\/$/, '') : raw
    setValues((v) => ({ ...v, [key]: val }))
    // Clear individual field error
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n })
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (pack.authRequired) {
      for (const f of credFields) {
        if (!values[f.key]?.trim() && f.key !== 'token') {
          errs[f.key] = 'Required'
        }
        if (values[f.key]?.trim() && f.validate) {
          const msg = f.validate(values[f.key])
          if (msg) errs[f.key] = msg
        }
      }
      // GitHub token is optional — don't require it
      if (pack.id !== 'github') {
        const tokenField = credFields.find((f) => f.key === 'token')
        if (tokenField && !values.token?.trim()) errs.token = 'Required'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function runConnectionTest() {
    setTestStatus('testing')
    setTestError('')

    const credentials = { ...values }

    // Find the first tool with no required inputs for the health check
    const testTool =
      pack.tools.find((t) => t.inputs.filter((i) => i.required).length === 0) ??
      pack.tools[0]

    if (!testTool) {
      setTestStatus('error')
      setTestError('No tools available to test.')
      return
    }

    const toolWithId = { ...testTool, id: generateId() }

    try {
      const res = await fetch('/api/tool-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolWithId, args: {}, credentials }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (data.success) {
        setTestStatus('success')
      } else {
        setTestStatus('error')
        setTestError(data.error ?? 'Connection failed.')
      }
    } catch (err) {
      setTestStatus('error')
      setTestError(err instanceof Error ? err.message : 'Connection test failed.')
    }
  }

  function handleInstall() {
    if (!validate()) return
    const credentials = { ...values }
    onInstall(packToTools(pack), credentials)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{pack.icon}</span>
            <div>
              <h2 className="text-sm font-semibold">{pack.name}</h2>
              <p className="text-xs text-white/30 mt-0.5">{pack.tools.length} tools included</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* Description */}
          <p className="text-xs text-white/40 leading-relaxed">{pack.description}</p>

          {/* Auth setup */}
          {pack.authRequired && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] text-white/25 uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3" />
                Authentication Required
              </div>

              <SetupBlurb pack={pack} />

              {credFields.map((f) => (
                <div key={f.key}>
                  <label className={label}>{f.label}</label>
                  <input
                    className={field}
                    type={f.type ?? 'text'}
                    value={values[f.key] ?? ''}
                    onChange={(e) => setValue(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    suppressHydrationWarning
                  />
                  {f.hint && !errors[f.key] && (
                    <p className="text-[10px] text-white/20 mt-1">{f.hint}</p>
                  )}
                  {errors[f.key] && <p className={errTxt}>{errors[f.key]}</p>}
                </div>
              ))}

              <p className="text-[10px] text-white/20">
                Stored in your browser only — never sent to our servers, never exported in generated code.
              </p>
            </div>
          )}

          {/* Tools list toggle */}
          <button
            onClick={() => setShowTools(!showTools)}
            className="w-full flex items-center justify-between text-xs text-white/35 hover:text-white/60 transition-colors py-1"
          >
            <span>See included tools ({pack.tools.length})</span>
            {showTools ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showTools && (
            <div className="space-y-1.5 -mt-1">
              {pack.tools.map((tool, i) => (
                <div key={i} className="flex items-start gap-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5">
                  <span className="font-mono text-[10px] text-white/50 bg-[#1a1a1a] border border-[#2a2a2a] px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                    {tool.name}
                  </span>
                  <span className="text-[10px] text-white/35 leading-relaxed">{tool.description.split('.')[0]}.</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#1a1a1a] px-6 py-4 space-y-3">
          {/* Test connection */}
          {pack.authRequired && (
            <div className="space-y-2">
              <button
                onClick={runConnectionTest}
                disabled={testStatus === 'testing'}
                className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 border border-[#2a2a2a] hover:border-[#444] px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
              >
                {testStatus === 'testing' && <Loader2 className="w-3 h-3 animate-spin" />}
                {testStatus === 'success' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                {testStatus === 'error' && <XCircle className="w-3 h-3 text-red-400" />}
                {testStatus === 'idle' && <span className="w-3 h-3 rounded-full border border-[#444] inline-block" />}
                {testStatus === 'testing' ? 'Testing...' : testStatus === 'success' ? 'Connected' : testStatus === 'error' ? 'Retry test' : 'Test connection'}
              </button>
              {testStatus === 'error' && testError && (
                <p className="text-[10px] text-red-400/80 bg-red-500/[0.06] border border-red-500/15 rounded-lg px-3 py-2">
                  {testError}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button onClick={onClose} className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleInstall}
              className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-5 py-2 rounded-md hover:bg-white/90 transition-colors"
            >
              Install {pack.tools.length} tools
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
