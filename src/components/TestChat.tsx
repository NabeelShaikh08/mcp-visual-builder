'use client'

import { useState, useRef, useEffect } from 'react'
import type { McpServer } from '@/types'
import { Send, Bot, User, AlertCircle } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  server: McpServer
}

export default function TestChat({ server }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const noTools = server.tools.length === 0

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = {
      id: Math.random().toString(36).slice(2),
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
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json()
      const assistantMsg: Message = {
        id: Math.random().toString(36).slice(2),
        role: 'assistant',
        content: data.content,
      }
      setMessages((m) => [...m, assistantMsg])
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
      <div className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-medium text-sm">Live Test Chat</h2>
          <p className="text-white/40 text-xs">
            {noTools
              ? 'Add tools in the Build tab first'
              : `Testing with ${server.tools.length} tool${server.tools.length !== 1 ? 's' : ''} — ${server.tools.map((t) => t.name).join(', ')}`}
          </p>
        </div>
        {!noTools && (
          <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded-full">
            Ready
          </span>
        )}
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
              msg.role === 'user' ? 'bg-blue-600' : 'bg-white/10'
            }`}>
              {msg.role === 'user'
                ? <User className="w-4 h-4" />
                : <Bot className="w-4 h-4 text-blue-400" />}
            </div>
            <div className={`max-w-2xl px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 border border-white/10 text-white/80'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 px-6 py-4">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage() }}
          className="flex gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || noTools}
            placeholder={noTools ? 'Add tools first...' : 'Ask Claude to use your tools...'}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || noTools}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white p-3 rounded-xl transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
