import Link from 'next/link'
import { Zap, Code2, TestTube2, Rocket } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-400" />
          <span className="font-semibold text-lg">MCP Visual Builder</span>
        </div>
        <a
          href="https://github.com/NabeelShaikh08"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          GitHub
        </a>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-8">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
          Model Context Protocol
        </div>

        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Build MCP Servers
          <span className="block text-blue-400">Without Writing Code</span>
        </h1>

        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed">
          Define your tools visually, connect to any REST API, test live with Claude,
          and download a ready-to-deploy MCP server in seconds.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/builder"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-lg transition-colors text-lg"
          >
            <Zap className="w-5 h-5" />
            Start Building
          </Link>
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-semibold px-8 py-4 rounded-lg transition-colors text-lg"
          >
            What is MCP?
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-12 text-white/80">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Code2 className="w-6 h-6 text-blue-400" />,
              step: '01',
              title: 'Define Your Tools',
              desc: 'Name your tool, describe what it does, add input parameters, and connect it to any REST API endpoint.',
            },
            {
              icon: <TestTube2 className="w-6 h-6 text-green-400" />,
              step: '02',
              title: 'Test Live',
              desc: 'Chat with Claude right in the browser. It calls your tools in real time — see exactly what gets sent and returned.',
            },
            {
              icon: <Rocket className="w-6 h-6 text-purple-400" />,
              step: '03',
              title: 'Deploy',
              desc: 'Download a ready-to-run server.js and the config snippet to paste into Claude Desktop. Done in seconds.',
            },
          ].map((item) => (
            <div key={item.step} className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                {item.icon}
                <span className="text-xs font-mono text-white/30">STEP {item.step}</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-white/30 text-sm">
        Built by Nabeel Shaikh · MCP Visual Builder v0.1.0
      </footer>
    </main>
  )
}
