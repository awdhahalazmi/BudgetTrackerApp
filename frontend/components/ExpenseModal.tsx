'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign, Calendar, Tag, FileText, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Category, Expense } from '@/types'
import { format } from 'date-fns'

interface ExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  budgetId: string
  expense?: Expense | null
  onSuccess: () => void
}

export default function ExpenseModal({
  isOpen, onClose, categories, budgetId, expense, onSuccess,
}: ExpenseModalProps) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (expense) {
      setTitle(expense.title)
      setAmount(expense.amount.toString())
      setCategoryId(expense.category_id)
      setDate(expense.date)
    } else {
      setTitle('')
      setAmount('')
      setCategoryId(categories[0]?.id || '')
      setDate(format(new Date(), 'yyyy-MM-dd'))
    }
    setError('')
  }, [expense, categories, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) { setError('Please enter a title'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Please enter a valid amount'); return }
    if (!categoryId) { setError('Please select a category'); return }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (expense) {
        const { error: err } = await supabase
          .from('expenses')
          .update({ title: title.trim(), amount: parseFloat(amount), category_id: categoryId, date })
          .eq('id', expense.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('expenses')
          .insert({
            title: title.trim(),
            amount: parseFloat(amount),
            category_id: categoryId,
            date,
            budget_id: budgetId,
            user_id: user.id,
          })
        if (err) throw err
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-800 mb-6">
          {expense ? '✏️ Edit Expense' : '➕ Add Expense'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">What did you spend on?</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Lunch, Netflix, Groceries…"
                className="input-field pl-10"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                className="input-field pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="input-field pl-10 appearance-none"
              >
                <option value="">Select category…</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </span>
              ) : expense ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
