import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MYFATOORAH_BASE = 'https://apitest.myfatoorah.com'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { paymentId } = await req.json()
    if (!paymentId) throw new Error('paymentId is required')

    // Falls back to the public MyFatoorah demo token for test mode
    const apiKey = Deno.env.get('MYFATOORAH_API_KEY')
      ?? 'SK_KWT_vVZlnnAqu8jRByOWaRPNId4ShzEDNt256dvnjebuyzo52dXjAfRx2ixW5umjWSUx'

    // Verify payment status with MyFatoorah
    const statusRes = await fetch(`${MYFATOORAH_BASE}/v2/GetPaymentStatus`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ Key: paymentId, KeyType: 'PaymentId' }),
    })

    const statusData = await statusRes.json()

    if (!statusData.IsSuccess) {
      throw new Error(statusData.Message || 'Failed to get payment status from MyFatoorah')
    }

    const invoiceStatus: string = statusData.Data?.InvoiceStatus ?? 'Pending'
    const invoiceId = String(statusData.Data?.InvoiceId ?? '')
    const isPaid = invoiceStatus === 'Paid'

    if (!invoiceId) throw new Error('No InvoiceId in MyFatoorah response')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Look up subscription by invoice_id and update status
    const { error: updateError } = await supabaseAdmin
      .from('planner_subscriptions')
      .update({
        status: isPaid ? 'active' : 'failed',
        payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('invoice_id', invoiceId)

    if (updateError) {
      console.error('Failed to update subscription:', updateError)
    }

    return new Response(
      JSON.stringify({
        status: isPaid ? 'success' : 'failed',
        invoiceStatus,
        invoiceId,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('verify-payment error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
