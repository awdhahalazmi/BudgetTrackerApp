'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, RepeatIcon } from 'lucide-react'
import { format } from 'date-fns'
import type { PlannedPayment } from '@/types'

const CATEGORIES = [
  { label: '🏠 Rent', value: 'Rent' },
  { label: '📱 Phone Bill', value: 'Phone Bill' },
  { label: '🌐 Internet', value: 'Internet' },
  { label: '⚡ Utilities', value: 'Utilities' },
  { label: '💳 Credit Card', value: 'Credit Card' },
  { label: '📺 Subscriptions', value: 'Subscriptions' },
  { label: '🚗 Car Payment', value: 'Car Payment' },
  { label: '🏦 Loan', value: 'Loan' },
  { label: '💊 Insurance', value: 'Insurance' },
  { label: '🎓 Education', value: 'Education' },
  { label: '💰 Savings', value: 'Savings' },
  { label: '📦 Other', value: 'Other' },
]

const CATEGORY_EMOJI: Record<string, string> = {
  'Rent': '🏠', 'Phone Bill': '📱', 'Internet': '🌐', 'Utilities': '⚡',
  'Credit Card': '💳', 'Subscriptions': '📺', 'Car Payment': '🚗', 'Loan': '🏦',
  'Insurance': '💊', 'Education': '🎓', 'Savings': '💰', 'Other': '📦',
}
export { CATEGORY_EMOJI }

interface Props {
  isOpen: boolean
  onClose: () => void
  payment?: PlannedPayment | null
  onSave: (data: Omit<PlannedPayment, 'id' | 'user_id' | 'created_at' | 'is_paid'>) => Promise<void>
}

export default function PlannedPaymentModal({ isOpen, onClose, payment, onSave }: Props) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Other')
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringInterval, setRecurringInterval] = useState<'weekly' | 'monthly' | 'yearly'>('monthly')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (payment) {
      setTitle(payment.title)
      setAmount(payment.amount.toString())
      setCategory(payment.category)
      setDueDate(payment.due_date)
      setIsRecurring(payment.is_recurring)
      setRecurringInterval(payment.recurring_interval ?? 'monthly')
      setNotes(payment.notes ?? '')
    } else {
      setTitle('')
      setAmount('')
      setCategory('Other')
      setDueDate(format(new Date(), 'yyyy-MM-dd'))
      setIsRecurring(false)
      setRecurringInterval('monthly')
      setNotes('')
    }
    setError('')
  }, [payment, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) { setError('Please enter a title'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Please enter a valid amount'); return }
    if (!dueDate) { setError('Please select a due date'); return }

    setLoading(true)
    try {
      await onSave({
        title: title.trim(),
        amount: parseFloat(amount),
        category,
        due_date: dueDate,
        is_recurring: isRecurring,
        recurring_interval: isRecurring ? recurringInterval : null,
        notes: notes.trim() || null,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-800 mb-6">
          {payment ? '✏️ Edit Payment' : '➕ Schedule Payment'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment name</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Apartment Rent, Netflix, Loan…"
              className="input-field"
              autoFocus
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.000"
                min="0.001"
                step="0.001"
                className="input-field pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">KD</span>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="input-field appearance-none"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Recurring */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setIsRecurring(v => !v)}
                className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${isRecurring ? 'bg-violet-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${isRecurring ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <RepeatIcon className="w-3.5 h-3.5" />
                  Recurring payment
                </div>
                <p className="text-xs text-slate-400">Auto-schedule next occurrence when paid</p>
              </div>
            </label>

            {isRecurring && (
              <div className="mt-3 ml-[52px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">Repeats every</label>
                <select
                  value={recurringInterval}
                  onChange={e => setRecurringInterval(e.target.value as 'weekly' | 'monthly' | 'yearly')}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <option value="weekly">Week</option>
                  <option value="monthly">Month</option>
                  <option value="yearly">Year</option>
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any details about this payment…"
              rows={2}
              className="input-field resize-none"
            />
          </div>

          {/* Buttons */}
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
              ) : payment ? 'Save Changes' : 'Schedule Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
