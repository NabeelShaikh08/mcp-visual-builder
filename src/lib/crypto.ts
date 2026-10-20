// Web Crypto API helpers for encrypting credentials in localStorage
// Uses AES-GCM with a per-browser key derived from a random salt

const SALT_KEY = 'mcp-builder-salt'

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

async function getOrCreateKey(): Promise<CryptoKey> {
  let saltB64 = localStorage.getItem(SALT_KEY)
  if (!saltB64) {
    const salt = crypto.getRandomValues(new Uint8Array(32))
    saltB64 = bufferToBase64(salt.buffer)
    localStorage.setItem(SALT_KEY, saltB64)
  }

  const rawKey = base64ToBuffer(saltB64)

  // Import the raw bytes as an AES-GCM key
  return crypto.subtle.importKey(
    'raw',
    rawKey.buffer.slice(rawKey.byteOffset, rawKey.byteOffset + rawKey.byteLength) as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a credentials object. Returns a base64 string with the IV (12 bytes)
 * prepended before the ciphertext.
 */
export async function encryptCredentials(
  creds: unknown
): Promise<string> {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(creds))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.byteLength)

  return bufferToBase64(combined.buffer)
}

/**
 * Decrypt credentials from a base64 string. Returns {} on any error so that
 * old unencrypted data (or corrupted data) degrades gracefully.
 */
export async function decryptCredentials(
  data: string
): Promise<unknown> {
  try {
    const key = await getOrCreateKey()
    const combined = base64ToBuffer(data)

    if (combined.byteLength < 13) return {}

    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    const text = new TextDecoder().decode(decrypted)
    return JSON.parse(text)
  } catch {
    return {}
  }
}
