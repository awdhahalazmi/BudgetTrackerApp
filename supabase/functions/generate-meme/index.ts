import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// All verified working template IDs on api.memegen.link
const TEMPLATES = [
  'drake', 'fry', 'doge', 'fine', 'harold', 'rollsafe',
  'gru', 'db', 'success', 'both', 'money', 'wallet',
  'sadfrog', 'regret', 'blb', 'yuno', 'noidea', 'cryingfloor',
]

// Encode text for memegen.link path segments
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
  // gru needs 4 lines — duplicate last line if short
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { title, amount, category, variant = 0, expenseId = '' } = await req.json()
    // Short unique suffix so identical expenses still get different memes
    const uniqueSuffix = expenseId.slice(-6).toUpperCase() || String(variant)

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENROUTER_API_KEY secret is not set' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const styleHint = STYLE_HINTS[variant % STYLE_HINTS.length]

    const prompt = `You are a creative meme writer for a personal budget tracker app. Generate a hilarious meme about this expense.

EXPENSE:
- Title: "${title}"
- Amount: $${amount}
- Category: ${category}
- Style: ${styleHint} (variant ${variant + 1} — ${variant > 0 ? 'pick a DIFFERENT template and joke than the obvious default' : 'use the most fitting classic meme'})
- Variety seed: ${uniqueSuffix} (internal use only — do NOT include this in any meme line)

AVAILABLE TEMPLATES (use ONLY these exact IDs):
${TEMPLATES.join(', ')}

RULES:
• Keep each line under 55 characters
• Make it funny, punchy, and relatable to someone who just spent money
• NEVER include the variety seed or any ID/code in the meme text
• The "gru" template needs exactly 4 lines (like a plan that goes wrong)
• All other templates need exactly 2 lines (top text, bottom text)
• Return ONLY a valid JSON object — no explanation, no markdown, no code block

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
      const errText = await response.text()
      throw new Error(`OpenRouter ${response.status}: ${errText}`)
    }

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content?.trim() ?? ''

    // Strip markdown code fences if the model wrapped the JSON
    const jsonStr = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    let parsed: { template: string; lines: string[] }
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      // If AI returned garbage, fall back to a safe default
      console.error('AI returned non-JSON:', rawContent)
      parsed = {
        template: 'fine',
        lines: [`Spent $${amount} on ${title}`, 'This is fine'],
      }
    }

    const url = buildMemeUrl(parsed.template, parsed.lines ?? [])

    return new Response(JSON.stringify({ url }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('generate-meme error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
