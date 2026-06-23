import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:3000'

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TEMPLATES = [
  'drake', 'fry', 'doge', 'fine', 'harold', 'rollsafe',
  'gru', 'db', 'success', 'both', 'money', 'wallet',
  'sadfrog', 'regret', 'blb', 'yuno', 'noidea', 'cryingfloor',
]

function enc(text: string): string {
  return String(text)
    .replace(/%/g, '~p')
    .replace(/#/g, '~h')
    .replace(/\?/g, '~q')
    .replace(/\//g, '~s')
    .replace(/ /g, '_')
    .replace(/&/g, 'and')
}

function buildMemeUrl(template: string, lines: string[]): string {
  const safeTemplate = TEMPLATES.includes(template) ? template : 'fine'
  const encoded = lines.map(enc)
  const finalLines = safeTemplate === 'gru'
    ? [...encoded, ...encoded].slice(0, 4)
    : encoded.slice(0, 2)
  return `https://api.memegen.link/images/${safeTemplate}/${finalLines.join('/')}.png`
}

const STYLE_HINTS = [
  'classic relatable spending guilt meme',
  'absurdist financial despair humor',
  'sarcastic self-aware budgeting joke',
  'dark humor about broke life',
  'motivational speech that backfires',
  'overdramatic reaction to a normal purchase',
  'relatable millennial money struggle',
  'philosophical take on why you deserve this purchase',
]

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Require authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    // Sanitize inputs — truncate to safe lengths, strip control chars
    const title    = String(body.title    ?? '').slice(0, 100).replace(/[\x00-\x1f]/g, '')
    const amount   = String(body.amount   ?? '').slice(0, 20)
    const category = String(body.category ?? '').slice(0, 50).replace(/[\x00-\x1f]/g, '')
    const variant  = Number(body.variant) || 0
    const expenseId = String(body.expenseId ?? '').slice(0, 36)

    const uniqueSuffix = expenseId.slice(-6).toUpperCase() || String(variant)

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Meme service unavailable' }),
        { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const styleHint = STYLE_HINTS[variant % STYLE_HINTS.length]

    const prompt = `You are a creative meme writer for a personal budget tracker app. Generate a hilarious meme about this expense.

EXPENSE:
- Title: "${title}"
- Amount: ${amount} KD
- Category: ${category}
- Style: ${styleHint} (variant ${variant + 1})
- Variety seed: ${uniqueSuffix} (internal — do NOT include in meme text)

AVAILABLE TEMPLATES (use ONLY these exact IDs):
${TEMPLATES.join(', ')}

RULES:
- Keep each line under 55 characters
- Make it funny, punchy, and relatable
- The "gru" template needs exactly 4 lines
- All other templates need exactly 2 lines
- Return ONLY valid JSON

RESPONSE FORMAT:
{"template":"<id>","lines":["<line1>","<line2>"]}`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://budget-tracker-app.vercel.app',
        'X-Title': 'Budget Tracker Meme Generator',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85,
        max_tokens: 180,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`)
    }

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content?.trim() ?? ''

    const jsonStr = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    let parsed: { template: string; lines: string[] }
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      console.error('AI returned non-JSON:', rawContent)
      parsed = { template: 'fine', lines: [`Spent ${amount} KD on ${title}`, 'This is fine'] }
    }

    const url = buildMemeUrl(parsed.template, parsed.lines ?? [])

    return new Response(JSON.stringify({ url }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('generate-meme error:', err)
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
