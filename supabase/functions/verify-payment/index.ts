import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:3000'

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MYFATOORAH_BASE = Deno.env.get('MYFATOORAH_BASE') || 'https://apitest.myfatoorah.com'

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

    const { paymentId } = await req.json()
    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'paymentId is required' }), {
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

    const statusRes = await fetch(`${MYFATOORAH_BASE}/v2/GetPaymentStatus`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ Key: paymentId, KeyType: 'PaymentId' }),
    })

    const statusData = await statusRes.json()
    if (!statusData.IsSuccess) throw new Error('Failed to retrieve payment status')

    const invoiceStatus: string = statusData.Data?.InvoiceStatus ?? 'Pending'
    const invoiceId = String(statusData.Data?.InvoiceId ?? '')
    const isPaid = invoiceStatus === 'Paid'

    if (!invoiceId) throw new Error('Invalid payment response')

    // Verify this invoice belongs to the authenticated user before updating
    const { data: sub, error: subError } = await supabaseAdmin
      .from('planner_subscriptions')
      .select('user_id')
      .eq('invoice_id', invoiceId)
      .single()

    if (subError || !sub) {
      return new Response(JSON.stringify({ error: 'Subscription not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    if (sub.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { error: updateError } = await supabaseAdmin
      .from('planner_subscriptions')
      .update({ status: isPaid ? 'active' : 'failed', payment_id: paymentId, updated_at: new Date().toISOString() })
      .eq('invoice_id', invoiceId)

    if (updateError) console.error('Failed to update subscription:', updateError.message)

    return new Response(
      JSON.stringify({ status: isPaid ? 'success' : 'failed', invoiceStatus, invoiceId }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('verify-payment error:', err)
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
