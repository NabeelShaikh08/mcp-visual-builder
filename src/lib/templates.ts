import type { McpTool } from '@/types'
import { generateId } from './utils'

export interface ToolTemplate {
  id: string
  category: string
  icon: string
  name: string
  label: string
  description: string
  tool: Omit<McpTool, 'id'>
}

export const TOOL_TEMPLATES: ToolTemplate[] = [
  {
    id: 'weather',
    category: 'Data',
    icon: '🌤',
    name: 'Weather',
    label: 'Current Weather',
    description: 'Get real-time weather for any city. Free, no API key needed.',
    tool: {
      name: 'get_weather',
      description: 'Get the current weather conditions for a given city',
      inputs: [
        { id: generateId(), name: 'city', type: 'string', description: 'The city name (e.g. Karachi, London)', required: true },
      ],
      connector: { method: 'GET', url: 'https://wttr.in/{city}?format=3', authType: 'none' },
    },
  },
  {
    id: 'news',
    category: 'Data',
    icon: '📰',
    name: 'News',
    label: 'Top Headlines',
    description: 'Fetch top news headlines by country. Requires free NewsAPI key.',
    tool: {
      name: 'get_headlines',
      description: 'Get the latest top news headlines for a given country',
      inputs: [
        { id: generateId(), name: 'country', type: 'string', description: 'Two-letter country code (e.g. us, gb, pk)', required: true },
        { id: generateId(), name: 'category', type: 'enum', description: 'News category', required: false, enumValues: ['business', 'entertainment', 'health', 'science', 'sports', 'technology'] },
      ],
      connector: { method: 'GET', url: 'https://newsapi.org/v2/top-headlines?country={country}&category={category}&apiKey={api_key}', authType: 'none' },
    },
  },
  {
    id: 'currency',
    category: 'Finance',
    icon: '💱',
    name: 'Currency',
    label: 'Currency Exchange',
    description: 'Convert between currencies using live exchange rates. Free, no key needed.',
    tool: {
      name: 'convert_currency',
      description: 'Convert an amount from one currency to another using live exchange rates',
      inputs: [
        { id: generateId(), name: 'from', type: 'string', description: 'Source currency code (e.g. USD, PKR, EUR)', required: true },
        { id: generateId(), name: 'to', type: 'string', description: 'Target currency code (e.g. USD, PKR, EUR)', required: true },
        { id: generateId(), name: 'amount', type: 'number', description: 'Amount to convert', required: true },
      ],
      connector: { method: 'GET', url: 'https://open.er-api.com/v6/latest/{from}', authType: 'none' },
    },
  },
  {
    id: 'geocode',
    category: 'Maps',
    icon: '🗺',
    name: 'Geocoding',
    label: 'Location Search',
    description: 'Turn any address or place name into coordinates. Free, no key needed.',
    tool: {
      name: 'geocode_location',
      description: 'Get the latitude and longitude coordinates for any address or place name',
      inputs: [
        { id: generateId(), name: 'query', type: 'string', description: 'Address or place name to geocode (e.g. Eiffel Tower, Paris)', required: true },
      ],
      connector: { method: 'GET', url: 'https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=3', authType: 'none' },
    },
  },
  {
    id: 'github_user',
    category: 'Developer',
    icon: '🐙',
    name: 'GitHub',
    label: 'GitHub User Info',
    description: 'Look up any GitHub user profile. Free, no auth needed for public data.',
    tool: {
      name: 'get_github_user',
      description: 'Get public profile information for a GitHub user including repos, followers, and bio',
      inputs: [
        { id: generateId(), name: 'username', type: 'string', description: 'GitHub username to look up', required: true },
      ],
      connector: { method: 'GET', url: 'https://api.github.com/users/{username}', authType: 'none' },
    },
  },
  {
    id: 'github_repos',
    category: 'Developer',
    icon: '📦',
    name: 'GitHub Repos',
    label: 'GitHub Repositories',
    description: "List a GitHub user's public repositories sorted by stars.",
    tool: {
      name: 'get_github_repos',
      description: "Get a list of public repositories for a GitHub user sorted by star count",
      inputs: [
        { id: generateId(), name: 'username', type: 'string', description: 'GitHub username', required: true },
      ],
      connector: { method: 'GET', url: 'https://api.github.com/users/{username}/repos?sort=stars&per_page=10', authType: 'none' },
    },
  },
  {
    id: 'jokes',
    category: 'Fun',
    icon: '😂',
    name: 'Jokes',
    label: 'Random Joke',
    description: 'Get a random programming or general joke. Free, no key needed.',
    tool: {
      name: 'get_joke',
      description: 'Get a random joke from a given category',
      inputs: [
        { id: generateId(), name: 'category', type: 'enum', description: 'Joke category', required: false, enumValues: ['Programming', 'Misc', 'Dark', 'Pun', 'Spooky', 'Christmas'] },
      ],
      connector: { method: 'GET', url: 'https://v2.jokeapi.dev/joke/{category}?safe-mode', authType: 'none' },
    },
  },
  {
    id: 'ip_lookup',
    category: 'Data',
    icon: '🔍',
    name: 'IP Lookup',
    label: 'IP Geolocation',
    description: 'Look up location and ISP info for any IP address. Free, no key needed.',
    tool: {
      name: 'lookup_ip',
      description: 'Get geolocation and ISP information for an IP address',
      inputs: [
        { id: generateId(), name: 'ip', type: 'string', description: 'IP address to look up (e.g. 8.8.8.8)', required: true },
      ],
      connector: { method: 'GET', url: 'https://ipapi.co/{ip}/json/', authType: 'none' },
    },
  },
  {
    id: 'dictionary',
    category: 'Data',
    icon: '📖',
    name: 'Dictionary',
    label: 'Word Definition',
    description: 'Look up definitions, phonetics, and examples for any English word. Free.',
    tool: {
      name: 'define_word',
      description: 'Get the dictionary definition, phonetics, and usage examples for an English word',
      inputs: [
        { id: generateId(), name: 'word', type: 'string', description: 'The English word to look up', required: true },
      ],
      connector: { method: 'GET', url: 'https://api.dictionaryapi.dev/api/v2/entries/en/{word}', authType: 'none' },
    },
  },
  {
    id: 'crypto',
    category: 'Finance',
    icon: '₿',
    name: 'Crypto',
    label: 'Crypto Price',
    description: 'Get live cryptocurrency prices. Free, no key needed.',
    tool: {
      name: 'get_crypto_price',
      description: 'Get the current price of a cryptocurrency in USD',
      inputs: [
        { id: generateId(), name: 'coin_id', type: 'string', description: 'Coin ID from CoinGecko (e.g. bitcoin, ethereum, solana)', required: true },
      ],
      connector: { method: 'GET', url: 'https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies=usd,pkr', authType: 'none' },
    },
  },
  {
    id: 'country',
    category: 'Data',
    icon: '🌍',
    name: 'Countries',
    label: 'Country Info',
    description: 'Get detailed info about any country — population, capital, currency, flag. Free.',
    tool: {
      name: 'get_country_info',
      description: 'Get detailed information about a country including population, capital, currency, and flag',
      inputs: [
        { id: generateId(), name: 'name', type: 'string', description: 'Country name (e.g. Pakistan, Germany, Brazil)', required: true },
      ],
      connector: { method: 'GET', url: 'https://restcountries.com/v3.1/name/{name}', authType: 'none' },
    },
  },
  {
    id: 'qr_code',
    category: 'Utility',
    icon: '📷',
    name: 'QR Code',
    label: 'Generate QR Code',
    description: 'Generate a QR code URL for any text or link. Free, no key needed.',
    tool: {
      name: 'generate_qr',
      description: 'Generate a QR code image URL for any text, URL, or data',
      inputs: [
        { id: generateId(), name: 'data', type: 'string', description: 'Text or URL to encode in the QR code', required: true },
        { id: generateId(), name: 'size', type: 'number', description: 'Size in pixels (default 200)', required: false },
      ],
      connector: { method: 'GET', url: 'https://api.qrserver.com/v1/create-qr-code/?data={data}&size={size}x{size}', authType: 'none' },
    },
  },
]

export const CATEGORIES = [...new Set(TOOL_TEMPLATES.map((t) => t.category))]

export function getTemplateById(id: string): ToolTemplate | undefined {
  return TOOL_TEMPLATES.find((t) => t.id === id)
}

export function templateToTool(template: ToolTemplate): McpTool {
  return {
    ...template.tool,
    id: generateId(),
    inputs: template.tool.inputs.map((inp) => ({ ...inp, id: generateId() })),
  }
}
