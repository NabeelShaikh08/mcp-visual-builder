'use client'

import { useState } from 'react'
import type { McpTool, ToolInput, HttpMethod, AuthType } from '@/types'
import { generateId, toSnakeCase } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  initial: McpTool | null
  existingTools?: McpTool[]
  onSave: (tool: McpTool) => void
  onCancel: () => void
}

const EMPTY_TOOL: McpTool = {
  id: '',
  name: '',
  description: '',
  inputs: [],
  connector: {
    method: 'GET',
    url: '',
    authType: 'none',
  },
}

export default function ToolForm({ initial, existingTools = [], onSave, onCancel }: Props) {
  const [tool, setTool] = useState<McpTool>(
    initial ?? { ...EMPTY_TOOL, id: generateId() }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  function update(patch: Partial<McpTool>) {
    setTool((t) => ({ ...t, ...patch }))
  }

  function addInput() {
    const input: ToolInput = {
      id: generateId(),
      name: '',
      type: 'string',
      description: '',
      required: true,
    }
    update({ inputs: [...tool.inputs, input] })
  }

  function updateInput(id: string, patch: Partial<ToolInput>) {
    update({
      inputs: tool.inputs.map((inp) =>
        inp.id === id ? { ...inp, ...patch } : inp
      ),
    })
  }

  function removeInput(id: string) {
    update({ inputs: tool.inputs.filter((inp) => inp.id !== id) })
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!tool.name.trim()) errs.name = 'Tool name is required'
    else if (!/^[a-z][a-z0-9_]*$/.test(tool.name))
      errs.name = 'Must be lowercase letters, numbers, underscores — start with a letter'
    else if (existingTools.some((t) => t.name === tool.name && t.id !== tool.id))
      errs.name = 'A tool with this name already exists'
    if (!tool.description.trim()) errs.description = 'Description is required'
    if (!tool.connector.url.trim()) errs.url = 'API URL is required'
    tool.inputs.forEach((inp, i) => {
      if (!inp.name.trim()) errs[`input_${i}_name`] = 'Input name required'
      if (!/^[a-z][a-z0-9_]*$/.test(inp.name))
        errs[`input_${i}_name`] = 'Must be snake_case'
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (validate()) onSave(tool)
  }

  const label = 'block text-xs text-white/40 uppercase tracking-wider mb-1.5'
  const input = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors text-white'
  const errText = 'text-red-400 text-xs mt-1'

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
      <h3 className="font-semibold text-lg">
        {initial ? 'Edit Tool' : 'New Tool'}
      </h3>

      {/* Name */}
      <div>
        <label className={label}>Tool Name <span className="text-white/20">(snake_case)</span></label>
        <input
          className={input}
          value={tool.name}
          onChange={(e) => update({ name: toSnakeCase(e.target.value) })}
          placeholder="get_weather"
        />
        {errors.name && <p className={errText}>{errors.name}</p>}
      </div>

      {/* Description */}
      <div>
        <label className={label}>Description <span className="text-white/20">(shown to the AI)</span></label>
        <textarea
          className={`${input} resize-none h-20`}
          value={tool.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Get the current weather for a given city and unit system"
        />
        {errors.description && <p className={errText}>{errors.description}</p>}
      </div>

      {/* API Connector */}
      <div className="space-y-3">
        <label className={label}>API Connector</label>

        <div className="flex gap-2">
          <select
            className={`${input} w-28 flex-shrink-0`}
            value={tool.connector.method}
            onChange={(e) =>
              update({ connector: { ...tool.connector, method: e.target.value as HttpMethod } })
            }
          >
            {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <div className="flex-1">
            <input
              className={input}
              value={tool.connector.url}
              onChange={(e) =>
                update({ connector: { ...tool.connector, url: e.target.value } })
              }
              placeholder="https://api.example.com/weather/{city}"
            />
            {errors.url && <p className={errText}>{errors.url}</p>}
            {tool.connector.url && /\{[^}]+\}/.test(tool.connector.url) && (
              <p className="text-[10px] text-white/25 mt-1">
                Placeholders detected: {[...tool.connector.url.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).join(', ')} — add matching input names below
              </p>
            )}
          </div>
        </div>

        <div>
          <label className={label}>Authentication</label>
          <select
            className={`${input}`}
            value={tool.connector.authType}
            onChange={(e) =>
              update({ connector: { ...tool.connector, authType: e.target.value as AuthType } })
            }
          >
            <option value="none">None</option>
            <option value="bearer">Bearer Token (env: API_TOKEN)</option>
            <option value="api-key">API Key Header (env: API_KEY)</option>
            <option value="basic">Basic Auth (env: API_USER / API_PASS)</option>
          </select>
        </div>

        {tool.connector.authType === 'api-key' && (
          <div>
            <label className={label}>Header Name</label>
            <input
              className={input}
              value={tool.connector.authHeader ?? ''}
              onChange={(e) =>
                update({ connector: { ...tool.connector, authHeader: e.target.value } })
              }
              placeholder="X-API-Key"
            />
          </div>
        )}

        {['POST', 'PUT', 'PATCH'].includes(tool.connector.method) && (
          <div>
            <label className={label}>
              Request Body Template{' '}
              <span className="text-white/20">(use {'{input_name}'} for values)</span>
            </label>
            <textarea
              className={`${input} resize-none h-24 font-mono text-xs`}
              value={tool.connector.bodyTemplate ?? ''}
              onChange={(e) =>
                update({ connector: { ...tool.connector, bodyTemplate: e.target.value } })
              }
              placeholder={'{\n  "city": "{city}",\n  "units": "{units}"\n}'}
            />
          </div>
        )}
      </div>

      {/* Inputs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className={label}>Input Parameters</label>
          <button
            onClick={addInput}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Input
          </button>
        </div>

        {tool.inputs.length === 0 && (
          <p className="text-white/30 text-sm">
            No inputs — tool takes no parameters from the AI.
          </p>
        )}

        <div className="space-y-3">
          {tool.inputs.map((inp, i) => (
            <div key={inp.id} className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/30">Input {i + 1}</span>
                <button
                  onClick={() => removeInput(inp.id)}
                  className="text-white/30 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Name</label>
                  <input
                    className={input}
                    value={inp.name}
                    onChange={(e) => updateInput(inp.id, { name: toSnakeCase(e.target.value) })}
                    placeholder="city"
                  />
                  {errors[`input_${i}_name`] && (
                    <p className={errText}>{errors[`input_${i}_name`]}</p>
                  )}
                </div>
                <div>
                  <label className={label}>Type</label>
                  <select
                    className={input}
                    value={inp.type}
                    onChange={(e) =>
                      updateInput(inp.id, { type: e.target.value as ToolInput['type'] })
                    }
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="enum">enum</option>
                  </select>
                </div>
              </div>

              {inp.type === 'enum' && (
                <div>
                  <label className={label}>Enum Values <span className="text-white/20">(comma separated)</span></label>
                  <input
                    className={input}
                    value={inp.enumValues?.join(', ') ?? ''}
                    onChange={(e) =>
                      updateInput(inp.id, {
                        enumValues: e.target.value.split(',').map((v) => v.trim()).filter(Boolean),
                      })
                    }
                    placeholder="celsius, fahrenheit, kelvin"
                  />
                </div>
              )}

              <div>
                <label className={label}>Description</label>
                <input
                  className={input}
                  value={inp.description}
                  onChange={(e) => updateInput(inp.id, { description: e.target.value })}
                  placeholder="The city to get weather for"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inp.required}
                  onChange={(e) => updateInput(inp.id, { required: e.target.checked })}
                  className="rounded"
                />
                Required
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2 rounded-lg transition-colors text-sm"
        >
          {initial ? 'Save Changes' : 'Add Tool'}
        </button>
        <button
          onClick={onCancel}
          className="text-white/40 hover:text-white text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
