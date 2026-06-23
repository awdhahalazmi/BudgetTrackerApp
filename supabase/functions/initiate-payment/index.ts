import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MYFATOORAH_BASE = 'https://apitest.myfatoorah.com'
const CURRENCY = 'KWD'

// Prices are enforced server-side — never trust the client for amounts
const VALID_PLANS: Record<string, { price: number; label: string }> = {
  basic: { price: 5.000, label: 'Basic Planner – Lifetime Access' },
  pro:   { price: 10.000, label: 'Pro Planner – Lifetime Access' },
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
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

    const { customerName, customerEmail, callbackUrl, paymentMethodId, plan } = await req.json()

    if (!paymentMethodId) {
      return new Response(JSON.stringify({ error: 'paymentMethodId is required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const planKey = (plan ?? 'basic').toLowerCase()
    const planMeta = VALID_PLANS[planKey]
    if (!planMeta) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('MYFATOORAH_API_KEY')
    if (!apiKey) {
      console.error('MYFATOORAH_API_KEY is not set')
      return new Response(JSON.stringify({ error: 'Payment service unavailable' }), {
        status: 503, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { data: existing } = await supabaseAdmin
      .from('planner_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'already_subscribed' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const execRes = await fetch(`${MYFATOORAH_BASE}/v2/ExecutePayment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        PaymentMethodId: paymentMethodId,
        CustomerName: customerName || 'User',
        DisplayCurrencyIso: CURRENCY,
        MobileCountryCode: '+965',
        CustomerMobile: '00000000',
        CustomerEmail: customerEmail,
        InvoiceValue: planMeta.price,
        CallBackUrl: callbackUrl,
        ErrorUrl: callbackUrl,
        Language: 'en',
        CustomerReference: user.id,
        InvoiceItems: [{
          ItemName: planMeta.label,
          Quantity: 1,
          UnitPrice: planMeta.price,
        }],
      }),
    })

    const execData = await execRes.json()

    if (!execData.IsSuccess) {
      throw new Error('Payment initiation failed')
    }

    const invoiceId = String(execData.Data.InvoiceId)
    const paymentUrl = execData.Data.PaymentURL

    await supabaseAdmin.from('planner_subscriptions').upsert({
      user_id: user.id,
      status: 'pending',
      plan: planKey,
      invoice_id: invoiceId,
      payment_id: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    return new Response(
      JSON.stringify({ paymentUrl, invoiceId }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('initiate-payment error:', err)
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
