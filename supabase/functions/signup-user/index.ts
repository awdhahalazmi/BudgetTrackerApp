import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:3000'

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    if (!EMAIL_RE.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    // Use anon client + standard GoTrue signUp — respects Supabase rate limits
    // and email verification settings configured in the dashboard
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ success: true, userId: data.user?.id }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('signup-user error:', err)
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
