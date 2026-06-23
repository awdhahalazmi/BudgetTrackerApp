'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, ArrowRight, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Suspense } from 'react'

type Status = 'loading' | 'success' | 'failed' | 'error'

function PaymentStatusContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')
  const verified = useRef(false)

  useEffect(() => {
    if (verified.current) return
    verified.current = true

    const paymentId = searchParams.get('paymentId') || searchParams.get('Id')

    if (!paymentId) {
      setStatus('error')
      setMessage('No payment ID received from the gateway. Please contact support.')
      return
    }

    const verify = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${supabaseUrl}/functions/v1/verify-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ paymentId }),
        })
        const data = await res.json()

        if (!res.ok) throw new Error(data.error || 'Verification failed')

        if (data.status === 'success') {
          setStatus('success')
          setMessage('Your payment was successful! You now have lifetime access to the Payment Planner.')
        } else {
          setStatus('failed')
          setMessage(`Payment was not completed (status: ${data.invoiceStatus}). No charge has been made.`)
        }
      } catch (err: unknown) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Could not verify payment. Please contact support.')
      }
    }

    verify()
  }, [searchParams])

  const handleContinue = async () => {
    // Refresh auth session so subscription status is reflected immediately
    await supabase.auth.refreshSession()
    router.push('/payment-planner')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md text-center animate-scale-in">
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Verifying Payment</h2>
            <p className="text-slate-500">Confirming your payment with MyFatoorah…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Payment Successful!</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">{message}</p>
            <button
              onClick={handleContinue}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold py-3.5 rounded-2xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-md flex items-center justify-center gap-2"
            >
              Open Payment Planner
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {(status === 'failed' || status === 'error') && (
          <>
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {status === 'failed' ? 'Payment Not Completed' : 'Verification Error'}
            </h2>
            <p className="text-slate-500 mb-8 leading-relaxed">{message}</p>
            <button
              onClick={() => router.push('/upgrade')}
              className="w-full bg-gradient-to-r from-rose-500 to-rose-600 text-white font-semibold py-3.5 rounded-2xl hover:from-rose-600 hover:to-rose-700 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-3 w-full text-sm text-slate-500 hover:text-slate-700 py-2"
            >
              Back to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <PaymentStatusContent />
    </Suspense>
  )
}
