'use client'

import { useState, useRef, useEffect } from 'react'
import type { McpServer } from '@/types'
import { Send, Bot, User, AlertCircle, Zap, Trash2 } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  server: McpServer
  credentials?: Record<string, string>
}

export default function TestChat({ server, credentials = {} }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSimulation, setIsSimulation] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const noTools = server.tools.length === 0

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    }

    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          server,
          credentials,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json()

      if (data.isSimulation) {
        setIsSimulation(true)
        setMessages((m) => [...m, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.content ?? 'Add ANTHROPIC_API_KEY to .env.local for real tool calls. Currently in simulation mode.',
        }])
        return
      }

      setIsSimulation(false)
      setMessages((m) => [...m, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
      }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-medium text-sm">AI Chat</h2>
          <p className="text-white/40 text-xs">
            {noTools
              ? 'Add tools in the Build tab first'
              : `Testing with ${server.tools.length} tool${server.tools.length !== 1 ? 's' : ''} — ${server.tools.map((t) => t.name).join(', ')}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSimulation && (
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full">
              Simulation mode
            </span>
          )}
          {!noTools && !isSimulation && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full">
              Ready
            </span>
          )}
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(null); setIsSimulation(false) }}
              title="Clear chat"
              className="p-1.5 text-white/20 hover:text-white/50 hover:bg-white/[0.04] rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-white/30 py-16">
            {noTools ? (
              <div className="space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-yellow-500/50" />
                <p>No tools defined yet.</p>
                <p className="text-xs">Go to the Build tab and add at least one tool first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Bot className="w-8 h-8 mx-auto text-blue-500/50" />
                <p>Send a message to test your MCP tools.</p>
                <p className="text-xs">Claude will call your tools when relevant.</p>
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-[#1a1a1a] border border-[#2a2a2a]'
            }`}>
              {msg.role === 'user'
                ? <User className="w-3.5 h-3.5 text-white/60" />
                : <Zap className="w-3.5 h-3.5 text-blue-400" />}
            </div>
            <div className={`max-w-2xl px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-[#1a1a1a] border border-[#2a2a2a] text-white/80'
                : 'bg-[#0d0d0d] border border-[#1a1a1a] text-white/70'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-red-400 bg-red-500/[0.06] border border-red-500/15 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1a1a1a] px-6 py-4">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage() }}
          className="flex gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || noTools}
            placeholder={noTools ? 'Add tools first...' : 'Ask Claude to use your tools...'}
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] focus:border-[#444] rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors disabled:opacity-40 text-white/80 placeholder:text-white/25"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || noTools}
            className="bg-white text-black disabled:opacity-30 p-3 rounded-xl transition-colors flex-shrink-0 hover:bg-white/90"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
