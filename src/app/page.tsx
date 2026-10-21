'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowRight, Layers, Zap, Terminal, Globe, AlertCircle } from 'lucide-react'

function AuthErrorBanner() {
  const params = useSearchParams()
  const error = params.get('error')
  if (!error) return null
  return (
    <div className="bg-red-500/10 border-b border-red-500/20 px-8 py-2.5 flex items-center gap-2 text-red-400 text-xs">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {error === 'auth_failed'
        ? 'Sign-in failed. Please try again.'
        : 'Something went wrong. Please try again.'}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-black" fill="black" />
          </div>
          <span className="text-sm font-semibold tracking-tight">MCP Builder</span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Docs
          </a>
          <a
            href="https://github.com/NabeelShaikh08"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            GitHub
          </a>
          <Link
            href="/builder"
            className="text-xs bg-white text-black font-medium px-3 py-1.5 rounded-md hover:bg-white/90 transition-colors"
          >
            Open Builder
          </Link>
        </div>
      </nav>

      {/* Auth error banner — shown when OAuth redirects back with ?error= */}
      <Suspense>
        <AuthErrorBanner />
      </Suspense>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-8 pt-28 pb-20">
        <div className="inline-flex items-center gap-2 border border-white/10 rounded-full px-3 py-1 text-xs text-white/40 mb-10">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          Model Context Protocol
        </div>

        <h1 className="text-[3.25rem] font-bold leading-[1.1] tracking-tight mb-6">
          Build MCP servers
          <br />
          <span className="text-white/30">without writing code.</span>
        </h1>

        <p className="text-base text-white/40 max-w-xl leading-relaxed mb-10">
          Define tools visually, connect to any REST API, and export a
          ready-to-run MCP server for Claude Desktop — in under two minutes.
        </p>

        <div className="flex items-center gap-3">
          <Link
            href="/builder"
            className="inline-flex items-center gap-2 bg-white text-black text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-white/90 transition-colors"
          >
            Start building
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors px-5 py-2.5"
          >
            What is MCP?
          </a>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-3xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden border border-white/[0.06]">
          {[
            {
              icon: <Layers className="w-4 h-4" />,
              num: '01',
              title: 'Define tools',
              desc: 'Name your tool, add inputs, connect it to any REST API endpoint.',
            },
            {
              icon: <Globe className="w-4 h-4" />,
              num: '02',
              title: 'Test live',
              desc: 'Chat in the browser. The AI simulates calling your tools in real time.',
            },
            {
              icon: <Terminal className="w-4 h-4" />,
              num: '03',
              title: 'Export & run',
              desc: 'Download server.js and the config snippet. Paste into Claude Desktop.',
            },
          ].map((item) => (
            <div key={item.num} className="bg-[#0a0a0a] px-6 py-7">
              <div className="flex items-center justify-between mb-5">
                <div className="text-white/30">{item.icon}</div>
                <span className="text-xs font-mono text-white/15">{item.num}</span>
              </div>
              <h3 className="text-sm font-semibold mb-2">{item.title}</h3>
              <p className="text-xs text-white/35 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-8 py-5 flex items-center justify-between">
        <span className="text-xs text-white/20">MCP Visual Builder</span>
        <span className="text-xs text-white/20">by Nabeel Shaikh</span>
      </footer>
    </div>
  )
}
