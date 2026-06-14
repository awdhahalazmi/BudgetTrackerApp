'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle, DollarSign, Wallet, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface CategoryDraft {
  id: string
  name: string
  emoji: string
  allocated_amount: number
}

const SUGGESTED_CATEGORIES: Omit<CategoryDraft, 'id' | 'allocated_amount'>[] = [
  { name: 'Groceries', emoji: '🛒' },
  { name: 'Food & Dining', emoji: '🍔' },
  { name: 'Transport', emoji: '🚗' },
  { name: 'Shopping', emoji: '🛍️' },
  { name: 'Entertainment', emoji: '🎬' },
  { name: 'Subscriptions', emoji: '📱' },
  { name: 'Coffee', emoji: '☕' },
  { name: 'Savings', emoji: '💰' },
]

const EMOJI_OPTIONS = ['🛒', '🍔', '🚗', '🛍️', '🎬', '📱', '☕', '💰', '💊', '✈️', '🎮', '📚', '🏋️', '🎵', '🏠', '💳']

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [categories, setCategories] = useState<CategoryDraft[]>(
    SUGGESTED_CATEGORIES.map((c, i) => ({ ...c, id: `draft-${i}`, allocated_amount: 0 }))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  const currentMonth = format(new Date(), 'yyyy-MM-01')

  useEffect(() => {
    const checkExistingBudget = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('budgets')
        .select('id')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .maybeSingle()

      if (data) { router.push('/dashboard'); return }
      setChecking(false)
    }
    checkExistingBudget()
  }, [router, currentMonth])

  const budget = parseFloat(monthlyBudget) || 0
  const totalAllocated = categories.reduce((sum, c) => sum + (c.allocated_amount || 0), 0)
  const remaining = budget - totalAllocated

  const addCategory = () => {
    setCategories(prev => [
      ...prev,
      { id: `draft-${Date.now()}`, name: '', emoji: '💳', allocated_amount: 0 },
    ])
  }

  const removeCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  const updateCategory = (id: string, field: keyof CategoryDraft, value: string | number) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const autoDistribute = () => {
    const zeroCats = categories.filter(c => c.allocated_amount === 0)
    if (zeroCats.length === 0 || remaining <= 0) return
    const share = Math.floor((remaining / zeroCats.length) * 100) / 100
    setCategories(prev => prev.map(c =>
      c.allocated_amount === 0 ? { ...c, allocated_amount: share } : c
    ))
  }

  const isStep2Valid = () => {
    if (categories.length === 0) return false
    if (categories.some(c => !c.name.trim())) return false
    if (Math.abs(totalAllocated - budget) > 0.01) return false
    return true
  }

  const handleFinish = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: budget_data, error: budgetError } = await supabase
        .from('budgets')
        .insert({ user_id: user.id, monthly_budget: budget, month: currentMonth })
        .select()
        .single()

      if (budgetError) throw budgetError

      const catRows = categories
        .filter(c => c.name.trim())
        .map(c => ({
          user_id: user.id,
          budget_id: budget_data.id,
          name: c.name.trim(),
          allocated_amount: c.allocated_amount,
        }))

      const { error: catError } = await supabase.from('categories').insert(catRows)
      if (catError) throw catError

      router.push('/dashboard')
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
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8 gap-3">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                s < step ? 'bg-emerald-400 text-white shadow-lg' :
                s === step ? 'bg-white text-violet-600 shadow-lg scale-110' :
                'bg-white/30 text-white'
              }`}>
                {s < step ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 rounded transition-all duration-300 ${s < step ? 'bg-emerald-400' : 'bg-white/30'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
          {/* Step 1: Monthly Budget */}
          {step === 1 && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-10 h-10 text-violet-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">What&apos;s your monthly budget?</h2>
              <p className="text-slate-500 mb-10">Set the total amount you want to spend this month</p>

              <div className="flex items-center justify-center gap-2 mb-8">
                <span className="text-5xl font-light text-slate-400">$</span>
                <input
                  type="number"
                  value={monthlyBudget}
                  onChange={e => setMonthlyBudget(e.target.value)}
                  placeholder="0"
                  min="1"
                  className="text-5xl font-bold text-violet-600 w-48 text-center bg-transparent border-b-2 border-violet-200 focus:border-violet-500 outline-none pb-2 transition-colors"
                />
              </div>

              <p className="text-slate-400 text-sm mb-8">You can always adjust this later</p>

              <button
                onClick={() => setStep(2)}
                disabled={budget <= 0}
                className="btn-primary inline-flex items-center gap-2"
              >
                Next: Set Categories <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: Categories */}
          {step === 2 && (
            <div className="p-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-slate-800">Customize your categories</h2>
                <span className="text-slate-500 text-sm font-medium">${budget.toFixed(2)} budget</span>
              </div>
              <p className="text-slate-500 mb-4">Assign amounts to each spending category</p>

              {/* Allocation bar */}
              <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                <div className="flex justify-between items-center mb-2 text-sm">
                  <span className="text-slate-600 font-medium">Allocated: <strong>${totalAllocated.toFixed(2)}</strong></span>
                  <span className={`font-semibold ${Math.abs(remaining) < 0.01 ? 'text-emerald-600' : remaining > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {Math.abs(remaining) < 0.01 ? '✓ Perfect!' : remaining > 0 ? `$${remaining.toFixed(2)} remaining` : `$${Math.abs(remaining).toFixed(2)} over!`}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      totalAllocated > budget ? 'bg-rose-400' :
                      Math.abs(totalAllocated - budget) < 0.01 ? 'bg-emerald-400' :
                      'bg-amber-400'
                    }`}
                    style={{ width: `${Math.min((totalAllocated / budget) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 mb-4">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <select
                      value={cat.emoji}
                      onChange={e => updateCategory(cat.id, 'emoji', e.target.value)}
                      className="text-xl bg-white border border-slate-200 rounded-lg p-1 cursor-pointer"
                    >
                      {EMOJI_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={e => updateCategory(cat.id, 'name', e.target.value)}
                      placeholder="Category name"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                    />
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input
                        type="number"
                        value={cat.allocated_amount || ''}
                        onChange={e => updateCategory(cat.id, 'allocated_amount', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        className="w-28 pl-6 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={() => removeCategory(cat.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mb-6">
                <button onClick={addCategory} className="btn-secondary flex items-center gap-1 text-sm px-4 py-2">
                  <Plus className="w-4 h-4" /> Add Category
                </button>
                {remaining > 0 && (
                  <button onClick={autoDistribute} className="flex items-center gap-1 text-sm px-4 py-2 bg-violet-50 border border-violet-200 text-violet-700 rounded-xl hover:bg-violet-100 transition-colors">
                    <Sparkles className="w-4 h-4" /> Auto-distribute
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!isStep2Valid()}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  Review Setup <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-10 h-10 text-violet-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Looks great! 🎉</h2>
                <p className="text-slate-500">Here&apos;s your budget summary for {format(new Date(), 'MMMM yyyy')}</p>
              </div>

              <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-5 mb-4 border border-violet-100">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Monthly Budget</span>
                  <span className="text-2xl font-bold text-violet-600">${budget.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
                {categories.filter(c => c.name.trim()).map(cat => (
                  <div key={cat.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xl">{cat.emoji}</span>
                    <span className="flex-1 font-medium text-slate-700">{cat.name}</span>
                    <div className="text-right">
                      <span className="font-semibold text-slate-800">${cat.allocated_amount.toFixed(2)}</span>
                      <p className="text-xs text-slate-400">{((cat.allocated_amount / budget) * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Setting up…
                    </>
                  ) : (
                    <>Start Tracking! <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
