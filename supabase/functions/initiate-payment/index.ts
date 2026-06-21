import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MYFATOORAH_BASE = 'https://apitest.myfatoorah.com'
const PLAN_PRICE = 1.000
const CURRENCY = 'KWD'

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

    const { customerName, customerEmail, callbackUrl } = await req.json()

    const apiKey = Deno.env.get('MYFATOORAH_API_KEY')
    if (!apiKey) throw new Error('MYFATOORAH_API_KEY secret is not set')

    // Check if user already has an active subscription
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

    // Step 1: Get available payment methods for KWD
    const initRes = await fetch(`${MYFATOORAH_BASE}/v2/InitiatePayment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ InvoiceAmount: PLAN_PRICE, CurrencyIso: CURRENCY }),
    })
    const initData = await initRes.json()

    // Pick first available payment method (KNET for Kuwait)
    const paymentMethodId = initData.Data?.PaymentMethods?.[0]?.PaymentMethodId ?? 2

    // Step 2: Create the payment invoice
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
        InvoiceValue: PLAN_PRICE,
        CallBackUrl: callbackUrl,
        ErrorUrl: callbackUrl,
        Language: 'en',
        CustomerReference: user.id,
        InvoiceItems: [{
          ItemName: 'Payment Planner – Lifetime Access',
          Quantity: 1,
          UnitPrice: PLAN_PRICE,
        }],
      }),
    })

    const execData = await execRes.json()

    if (!execData.IsSuccess) {
      throw new Error(execData.Message || 'MyFatoorah ExecutePayment failed')
    }

    const invoiceId = String(execData.Data.InvoiceId)
    const paymentUrl = execData.Data.PaymentURL

    // Store pending subscription (upsert: one record per user)
    await supabaseAdmin.from('planner_subscriptions').upsert({
      user_id: user.id,
      status: 'pending',
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
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
