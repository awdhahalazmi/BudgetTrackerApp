'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Shield, ArrowRight, Loader2, Zap, Star,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

const PLANS = [
  {
    id: 'basic',
    name: 'Basic Planner',
    price: 5,
    priceDisplay: '5.000',
    description: 'For personal budgeters getting started.',
    features: [
      'Schedule up to 20 payments',
      'Due date tracking',
      'Paid / unpaid tracker',
      'Monthly summary view',
      'Lifetime access',
    ],
    popular: false,
    accent: 'from-slate-600 to-slate-700',
    border: 'border-slate-200',
    selectedBorder: 'border-slate-700',
    badge: null,
  },
  {
    id: 'pro',
    name: 'Pro Planner',
    price: 10,
    priceDisplay: '10.000',
    description: 'Full control over every bill and subscription.',
    features: [
      'Unlimited planned payments',
      'Calendar & timeline view',
      'Recurring payment automation',
      'Budget impact estimator',
      'Paid / unpaid tracker',
      'Lifetime access',
    ],
    popular: true,
    accent: 'from-violet-600 to-purple-700',
    border: 'border-violet-200',
    selectedBorder: 'border-violet-600',
    badge: 'Most Popular',
  },
]

interface PaymentMethod {
  id: number
  nameEn: string
  nameAr: string
  code: string
  imageUrl: string
  serviceCharge: number
}

export default function UpgradePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string; id?: string; name?: string } | null>(null)
  const [selectedPlan, setSelectedPlan] = useState(PLANS[1])
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [loadingMethods, setLoadingMethods] = useState(true)
  const [paying, setPaying] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }

      const { data: sub } = await supabase
        .from('planner_subscriptions')
        .select('status')
        .eq('user_id', u.id)
        .eq('status', 'active')
        .maybeSingle()

      if (sub) { router.push('/payment-planner'); return }

      setUser({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
      })
      setChecking(false)

      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/get-payment-methods`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        const data = await res.json()
        if (data.methods?.length) {
          setMethods(data.methods)
          setSelectedMethod(data.methods[0])
        }
      } catch {
        setError('Could not load payment methods. Please refresh.')
      } finally {
        setLoadingMethods(false)
      }
    }
    init()
  }, [router, supabaseUrl])

  const handlePay = async () => {
    if (!user || !selectedMethod) return
    setPaying(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${supabaseUrl}/functions/v1/initiate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          customerName: user.name,
          customerEmail: user.email,
          callbackUrl: `${window.location.origin}/payment-status`,
          paymentMethodId: selectedMethod.id,
          plan: selectedPlan.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'already_subscribed') { router.push('/payment-planner'); return }
        throw new Error(data.error || 'Payment initiation failed')
      }

      window.location.href = data.paymentUrl
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPaying(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userEmail={user?.email} />

      <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-slate-800 mb-3">
            Choose your{' '}
            <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              plan
            </span>
          </h1>
          <p className="text-slate-500 text-base max-w-md mx-auto">
            One-time payment. Lifetime access. No subscriptions.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {PLANS.map(plan => {
            const isSelected = selectedPlan.id === plan.id
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`relative text-left rounded-3xl border-2 p-6 transition-all shadow-sm hover:shadow-md ${
                  isSelected
                    ? `${plan.selectedBorder} bg-white shadow-md`
                    : `${plan.border} bg-white hover:border-slate-300`
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    <Star className="w-3 h-3" />
                    {plan.badge}
                  </span>
                )}

                {/* Selection indicator */}
                <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected ? 'border-violet-600 bg-violet-600' : 'border-slate-300'
                }`}>
                  {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>

                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${plan.accent} flex items-center justify-center mb-4`}>
                  {plan.id === 'pro' ? (
                    <Zap className="w-5 h-5 text-white" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  )}
                </div>

                <h2 className="text-lg font-bold text-slate-800 mb-0.5">{plan.name}</h2>
                <p className="text-xs text-slate-500 mb-4">{plan.description}</p>

                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-extrabold text-slate-800">{plan.priceDisplay}</span>
                  <span className="text-base font-semibold text-slate-500">KD</span>
                </div>

                <ul className="space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        {/* Checkout card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Choose payment method
          </p>

          {loadingMethods ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
            </div>
          ) : methods.length === 0 ? (
            <p className="text-sm text-rose-500 text-center py-4">
              Could not load payment methods. Please refresh.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
              {methods.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m)}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                    selectedMethod?.id === m.id
                      ? 'border-violet-500 bg-violet-50 shadow-sm'
                      : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="h-7 flex items-center justify-center">
                    {m.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.imageUrl}
                        alt={m.nameEn}
                        className="h-6 w-auto object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-600">{m.nameEn}</span>
                    )}
                  </div>
                  <span className={`text-[11px] font-semibold leading-tight text-center ${
                    selectedMethod?.id === m.id ? 'text-violet-700' : 'text-slate-500'
                  }`}>
                    {m.nameEn}
                  </span>
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="text-rose-600 text-sm mb-4 p-3 bg-rose-50 rounded-xl border border-rose-200">
              {error}
            </p>
          )}

          <button
            onClick={handlePay}
            disabled={paying || !selectedMethod || loadingMethods}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold py-3.5 rounded-2xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {paying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to payment…
              </>
            ) : (
              <>
                Pay {selectedPlan.priceDisplay} KD with {selectedMethod?.nameEn ?? '…'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5" />
            Secured by MyFatoorah
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          Already paid?{' '}
          <button
            onClick={() => router.push('/payment-planner')}
            className="text-violet-600 hover:underline"
          >
            Go to Payment Planner
          </button>
        </p>
      </div>
    </div>
  )
}
