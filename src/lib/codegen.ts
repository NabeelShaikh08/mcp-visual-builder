import type { McpServer, McpTool, ToolInput } from '@/types'

// Derive a stable env var name for a tool's auth token
function tokenEnvVar(tool: McpTool): string {
  const { authType, authHeader } = tool.connector
  if (authType === 'api-key' && authHeader) {
    // e.g. X-Shopify-Access-Token → SHOPIFY_ACCESS_TOKEN
    return authHeader
      .replace(/^X-/i, '')
      .replace(/-/g, '_')
      .toUpperCase()
  }
  // For bearer: derive from tool name prefix, e.g. stripe_list_orders → STRIPE_TOKEN
  const prefix = tool.name.split('_')[0].toUpperCase()
  return `${prefix}_TOKEN`
}

// Collect all unique env vars needed by a server
export function collectEnvVars(server: McpServer): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const tool of server.tools) {
    const { authType } = tool.connector
    if (authType === 'bearer' || authType === 'api-key') {
      const key = tokenEnvVar(tool)
      if (!vars[key]) vars[key] = ''
    } else if (authType === 'basic') {
      vars['API_USER'] = ''
      vars['API_PASS'] = ''
    }
  }
  return vars
}

// Generate Zod schema string for a tool's inputs — excluding credential placeholders
function genZodSchema(inputs: ToolInput[], credentialKeys: Set<string>): string {
  const filtered = inputs.filter((inp) => !credentialKeys.has(inp.name))
  if (filtered.length === 0) return 'z.object({})'
  const fields = filtered.map((inp) => {
    let zodType = ''
    if (inp.type === 'string') zodType = 'z.string()'
    else if (inp.type === 'number') zodType = 'z.number()'
    else if (inp.type === 'boolean') zodType = 'z.boolean()'
    else if (inp.type === 'enum' && inp.enumValues?.length) {
      const vals = inp.enumValues.map((v) => `"${v}"`).join(', ')
      zodType = `z.enum([${vals}])`
    } else {
      zodType = 'z.string()'
    }
    if (!inp.required) zodType += '.optional()'
    return `    ${inp.name}: ${zodType}.describe("${inp.description.replace(/"/g, '\\"')}")`
  })
  return `z.object({\n${fields.join(',\n')}\n  })`
}

// Generate the fetch call for a tool, substituting known credential values into the URL
function genFetchCall(tool: McpTool, credentials: Record<string, string>): string {
  const { connector } = tool
  const lines: string[] = []
  const envVar = tokenEnvVar(tool)

  // Substitute credential placeholders in URL at code-gen time (e.g. {shop_domain})
  // These are config values, not secrets — bake them in
  // Use plain string replace (not RegExp) to avoid injection if the key has regex chars
  let resolvedUrlTemplate = connector.url
  for (const [k, v] of Object.entries(credentials)) {
    if (v && k !== 'token' && k !== 'consumer_secret') {
      resolvedUrlTemplate = resolvedUrlTemplate.split(`{${k}}`).join(v)
    }
  }

  // Remaining {placeholders} are runtime args → convert to template literal expressions
  const urlExpr = `\`${resolvedUrlTemplate.replace(/\{([^}]+)\}/g, '${args.$1}')}\``

  // Build headers
  const headers: string[] = ['"Content-Type": "application/json"']
  if (connector.authType === 'bearer') {
    headers.push(`"Authorization": \`Bearer \${process.env.${envVar}}\``)
  } else if (connector.authType === 'api-key' && connector.authHeader) {
    headers.push(`"${connector.authHeader}": \`\${process.env.${envVar}}\``)
  } else if (connector.authType === 'basic') {
    headers.push('"Authorization": `Basic ${Buffer.from(`${process.env.API_USER}:${process.env.API_PASS}`).toString("base64")}`')
  }

  lines.push(`    const url = ${urlExpr}`)
  lines.push('    try { new URL(url) } catch { throw new Error(`Invalid URL: ${url}`) }')
  lines.push('')
  lines.push('    const controller = new AbortController()')
  lines.push('    const timeout = setTimeout(() => controller.abort(), 10000)')
  lines.push('    try {')
  lines.push(`      const res = await fetch(url, {`)
  lines.push(`        method: "${connector.method}",`)
  lines.push(`        headers: { ${headers.join(', ')} },`)

  if (['POST', 'PUT', 'PATCH'].includes(connector.method)) {
    if (connector.bodyTemplate) {
      const tpl = connector.bodyTemplate.replace(/`/g, '\\`').replace(/\{([^}]+)\}/g, '${args.$1}')
      lines.push(`        body: \`${tpl}\`,`)
    } else {
      lines.push('        body: JSON.stringify(args),')
    }
  }

  lines.push('        signal: controller.signal,')
  lines.push('      })')
  lines.push('      clearTimeout(timeout)')
  lines.push('      if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)')
  lines.push('      const data = await res.json()')
  lines.push('      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] }')
  lines.push('    } catch (err) {')
  lines.push('      clearTimeout(timeout)')
  lines.push('      if (err instanceof Error && err.name === \'AbortError\') throw new Error(\'Request timed out after 10s\')')
  lines.push('      throw err')
  lines.push('    }')

  return lines.join('\n')
}

// Generate the full MCP server file content
export function generateServerCode(server: McpServer, credentials: Record<string, string> = {}): string {
  // Keys that are credential config values, not tool inputs
  const credentialKeys = new Set(Object.keys(credentials))

  const toolBlocks = server.tools.map((tool) => {
    return `  server.tool(
    "${tool.name}",
    "${tool.description.replace(/"/g, '\\"')}",
    ${genZodSchema(tool.inputs, credentialKeys)},
    async (args) => {
      try {
${genFetchCall(tool, credentials)}
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return { content: [{ type: "text", text: \`Error: \${msg}\` }], isError: true }
      }
    }
  )`
  }).join('\n\n')

  // Collect env vars and build comment block
  const envVars = collectEnvVars(server)
  const envComment = Object.keys(envVars).length > 0
    ? `// Required environment variables:\n// ${Object.keys(envVars).map((k) => `${k}=...`).join('\n// ')}\n\n`
    : ''

  const safeName = server.name.replace(/\*\//g, '* /')
  const safeDesc = server.description.replace(/\*\//g, '* /')

  return `/**
 * MCP Server: ${safeName}
 * ${safeDesc}
 * Generated by MCP Visual Builder
 * ${new Date().toISOString()}
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

${envComment}const server = new McpServer({
  name: "${safeName}",
  version: "1.0.0",
})

${toolBlocks}

const transport = new StdioServerTransport()
await server.connect(transport)
console.error("${safeName} MCP server running")
`
}

// Generate claude_desktop_config.json with env vars pre-filled where possible
export function generateClaudeConfig(server: McpServer, credentials: Record<string, string> = {}): string {
  const key = server.name.toLowerCase().replace(/\s+/g, '-')

  // Build env block: put actual credential values that are secrets (token, consumer_secret)
  const envVars = collectEnvVars(server)
  const env: Record<string, string> = {}
  for (const varName of Object.keys(envVars)) {
    // Map env var name back to credential key
    if (varName.endsWith('_TOKEN') || varName.endsWith('_KEY') || varName.endsWith('_SECRET')) {
      env[varName] = credentials.token ?? credentials.consumer_secret ?? ''
    } else if (varName === 'API_USER') {
      env[varName] = credentials.api_user ?? ''
    } else if (varName === 'API_PASS') {
      env[varName] = credentials.api_pass ?? ''
    } else {
      env[varName] = ''
    }
  }

  return JSON.stringify({
    mcpServers: {
      [key]: {
        command: 'node',
        args: [`${key}/server.js`],
        env,
      },
    },
  }, null, 2)
}

// Generate a minimal package.json for the exported server
export function generateServerPackageJson(server: McpServer): string {
  return JSON.stringify({
    name: server.name.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    type: 'module',
    main: 'server.js',
    scripts: { start: 'node server.js' },
    dependencies: {
      '@modelcontextprotocol/sdk': '^1.32.1',
      zod: '^3.25.0',
    },
  }, null, 2)
}

// Generate a bash install script (Mac/Linux)
export function generateInstallScriptUnix(server: McpServer, credentials: Record<string, string> = {}): string {
  const key = server.name.toLowerCase().replace(/\s+/g, '-')
  const envVars = collectEnvVars(server)
  const envExports = Object.keys(envVars).map((k) => `export ${k}="your_value_here"`).join('\n')

  return `#!/usr/bin/env bash
# Installer for MCP server: ${server.name}
# Generated by MCP Visual Builder
set -e

INSTALL_DIR="$HOME/.mcp-servers/${key}"
mkdir -p "$INSTALL_DIR"

echo "Installing ${server.name} MCP server..."

cat > "$INSTALL_DIR/server.js" << 'SERVEREOF'
${generateServerCode(server, credentials)}
SERVEREOF

cat > "$INSTALL_DIR/package.json" << 'PKGEOF'
${generateServerPackageJson(server)}
PKGEOF

cd "$INSTALL_DIR"
npm install --silent

echo ""
echo "Add this to ~/Library/Application Support/Claude/claude_desktop_config.json:"
echo ""
cat << 'CONFIGEOF'
${generateClaudeConfig(server, credentials)}
CONFIGEOF

echo ""
echo "Done! Set your env vars, then restart Claude Desktop."
${envExports ? `\n# Set these env vars in your shell or in the Claude config env block:\n${envExports}` : ''}
`
}

// Generate a PowerShell install script (Windows)
export function generateInstallScriptWindows(server: McpServer, credentials: Record<string, string> = {}): string {
  const key = server.name.toLowerCase().replace(/\s+/g, '-')
  // Escape single quotes in embedded content for PowerShell here-strings
  const serverCode = generateServerCode(server, credentials).replace(/'/g, "''")
  const packageJson = generateServerPackageJson(server).replace(/'/g, "''")
  const claudeConfig = generateClaudeConfig(server, credentials).replace(/'/g, "''")

  return `# Installer for MCP server: ${server.name}
# Generated by MCP Visual Builder
# Run in PowerShell: .\\install.ps1

$installDir = "$env:USERPROFILE\\.mcp-servers\\${key}"
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

Write-Host "Installing ${server.name} MCP server..."

Set-Content -Path "$installDir\\server.js" -Value @'
${serverCode}
'@ -Encoding UTF8

Set-Content -Path "$installDir\\package.json" -Value @'
${packageJson}
'@ -Encoding UTF8

Set-Location $installDir
npm install --silent

$configDir = "$env:APPDATA\\Claude"
New-Item -ItemType Directory -Force -Path $configDir | Out-Null

Write-Host ""
Write-Host "Add this to $configDir\\claude_desktop_config.json:"
Write-Host ""
Write-Host @'
${claudeConfig}
'@

Write-Host ""
Write-Host "Done! Set your env vars in the config, then restart Claude Desktop."
`
}
