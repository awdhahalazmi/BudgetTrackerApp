'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays, Bell, CheckCircle2, TrendingDown, RepeatIcon,
  BarChart3, Shield, ArrowRight, Wallet, Lock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Schedule Payments',
    desc: 'Plan rent, loans, and bills ahead of time with exact due dates.',
    color: 'bg-violet-100 text-violet-600',
  },
  {
    icon: Bell,
    title: 'Due Date Reminders',
    desc: "See what's coming up and never miss a payment deadline.",
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: CheckCircle2,
    title: 'Paid / Unpaid Tracker',
    desc: 'Mark payments as paid and track your monthly obligations at a glance.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: CalendarDays,
    title: 'Calendar View',
    desc: 'Visualize all upcoming payments on a monthly calendar timeline.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: TrendingDown,
    title: 'Budget Impact Estimator',
    desc: 'See exactly how much monthly budget remains after all planned payments.',
    color: 'bg-rose-100 text-rose-600',
  },
  {
    icon: RepeatIcon,
    title: 'Recurring Payments',
    desc: 'Set up Netflix, phone bills, and rent as automatic monthly recurring items.',
    color: 'bg-purple-100 text-purple-600',
  },
]

export default function UpgradePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string; id?: string; name?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }

      // Redirect if already subscribed
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
    }
    checkAuth()
  }, [router])

  const handlePay = async () => {
    if (!user) return
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const callbackUrl = `${window.location.origin}/payment-status`

      const res = await fetch(`${supabaseUrl}/functions/v1/initiate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          customerName: user.name,
          customerEmail: user.email,
          callbackUrl,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'already_subscribed') {
          router.push('/payment-planner')
          return
        }
        throw new Error(data.error || 'Payment initiation failed')
      }

      // Redirect to MyFatoorah payment page
      window.location.href = data.paymentUrl
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
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

      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <Lock className="w-3.5 h-3.5" />
            Premium Feature
          </div>
          <h1 className="text-4xl font-extrabold text-slate-800 mb-4">
            Unlock the{' '}
            <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Payment Planner
            </span>
          </h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Plan every bill, subscription, and loan payment in one place — so your budget never gets surprised.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {FEATURES.map(f => {
            const Icon = f.icon
            return (
              <div key={f.title} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${f.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Pricing card */}
        <div className="max-w-sm mx-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-violet-100 overflow-hidden">
            {/* Card header */}
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-6 text-white text-center">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-0.5">Payment Planner</h2>
              <p className="text-violet-200 text-sm">One-time unlock · Lifetime access</p>
              <div className="mt-4">
                <span className="text-5xl font-extrabold">1</span>
                <span className="text-2xl font-semibold">.000</span>
                <span className="text-xl font-medium ml-1">KD</span>
              </div>
            </div>

            {/* Included list */}
            <div className="p-6">
              <ul className="space-y-2.5 mb-6">
                {[
                  'Schedule unlimited future payments',
                  'Calendar & timeline views',
                  'Recurring payment automation',
                  'Budget impact estimator',
                  'Mark paid / unpaid tracking',
                  'Lifetime access — pay once',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              {error && (
                <p className="text-rose-600 text-sm mb-4 p-3 bg-rose-50 rounded-xl border border-rose-200">
                  {error}
                </p>
              )}

              <button
                onClick={handlePay}
                disabled={loading}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold py-3.5 rounded-2xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Redirecting to payment…
                  </>
                ) : (
                  <>
                    Pay with KNET — 1.000 KD
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left space-y-1">
                <p className="font-semibold">🧪 Test mode — use this card:</p>
                <p>Card: <span className="font-mono font-bold">4508750015741019</span></p>
                <p>Expiry: <span className="font-mono">Any</span> &nbsp; CVV: <span className="font-mono">Any</span></p>
              </div>

              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-400">
                <Shield className="w-3.5 h-3.5" />
                Secured by MyFatoorah · Test mode active
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">
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
    </div>
  )
}
