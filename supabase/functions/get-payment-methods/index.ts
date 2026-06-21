import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

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
    const apiKey = Deno.env.get('MYFATOORAH_API_KEY')
      ?? 'SK_KWT_vVZlnnAqu8jRByOWaRPNId4ShzEDNt256dvnjebuyzo52dXjAfRx2ixW5umjWSUx'

    const res = await fetch(`${MYFATOORAH_BASE}/v2/InitiatePayment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ InvoiceAmount: PLAN_PRICE, CurrencyIso: CURRENCY }),
    })

    const data = await res.json()

    if (!data.IsSuccess) {
      throw new Error(data.Message || 'Failed to fetch payment methods')
    }

    const methods = (data.Data?.PaymentMethods ?? []).map((m: {
      PaymentMethodId: number
      PaymentMethodEn: string
      PaymentMethodAr: string
      PaymentMethodCode: string
      ImageUrl: string
      ServiceCharge: number
    }) => ({
      id: m.PaymentMethodId,
      nameEn: m.PaymentMethodEn,
      nameAr: m.PaymentMethodAr,
      code: m.PaymentMethodCode,
      imageUrl: m.ImageUrl,
      serviceCharge: m.ServiceCharge ?? 0,
    }))

    return new Response(
      JSON.stringify({ methods }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('get-payment-methods error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
