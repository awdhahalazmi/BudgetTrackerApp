import { generateMeme } from './memeGenerator'

const EDGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-meme`
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const STORAGE_KEY = 'budget-meme-cache'

// In-memory layer: fastest lookup, cleared on page refresh
const memCache = new Map<string, string>()

function readStorage(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function writeStorage(key: string, url: string) {
  if (typeof window === 'undefined') return
  try {
    const current = readStorage()
    current[key] = url
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {}
}

export async function fetchMemeUrl(
  expenseId: string,
  title: string,
  amount: number,
  category: string,
  variant: number,
): Promise<string> {
  const key = `${expenseId}:${variant}`

  // 1. In-memory cache (fastest)
  if (memCache.has(key)) return memCache.get(key)!

  // 2. Persistent localStorage cache (survives page refresh)
  const stored = readStorage()
  if (stored[key]) {
    memCache.set(key, stored[key])
    return stored[key]
  }

  // 3. Fetch from edge function
  try {
    const res = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ title, amount, category, variant, expenseId }),
    })

    if (!res.ok) throw new Error(`Edge function returned ${res.status}`)

    const data = await res.json()
    if (!data.url) throw new Error('No URL in response')

    memCache.set(key, data.url)
    writeStorage(key, data.url)
    return data.url
  } catch (err) {
    // Fallback to local generator so the UI never breaks
    console.warn('generate-meme edge function failed, using local fallback:', err)
    const local = generateMeme(title, amount, category, variant, expenseId)
    memCache.set(key, local.url)
    writeStorage(key, local.url)
    return local.url
  }
}
