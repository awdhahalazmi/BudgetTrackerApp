'use client'

import { useState } from 'react'
import { Receipt, Pencil, Trash2, Plus, Search } from 'lucide-react'
import type { Expense, CategoryWithStats } from '@/types'
import { format, isToday, isYesterday, parseISO } from 'date-fns'

interface ExpenseListProps {
  expenses: Expense[]
  categories: CategoryWithStats[]
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
  onAdd: () => void
}

function formatDate(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

const CATEGORY_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700',
  'bg-indigo-100 text-indigo-700',
]

export default function ExpenseList({ expenses, categories, onEdit, onDelete, onAdd }: ExpenseListProps) {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showCount, setShowCount] = useState(8)

  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const categoryColorMap = Object.fromEntries(
    categories.map((c, i) => [c.id, CATEGORY_COLORS[i % CATEGORY_COLORS.length]])
  )

  const filtered = expenses.filter(e => {
    if (filter !== 'all' && e.category_id !== filter) return false
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const visible = filtered.slice(0, showCount)

  const categoriesWithExpenses = categories.filter(c =>
    expenses.some(e => e.category_id === c.id)
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-violet-100">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-violet-500" />
          <h2 className="text-lg font-bold text-slate-800">Recent Expenses</h2>
          {filtered.length > 0 && (
            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
              {filtered.length}
            </span>
          )}
        </div>
        <button onClick={onAdd} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 pb-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search expenses…"
            className="input-field pl-9 text-sm py-2"
          />
        </div>

        {/* Category tabs */}
        {categoriesWithExpenses.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setFilter('all')}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {categoriesWithExpenses.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filter === cat.id
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name} ({expenses.filter(e => e.category_id === cat.id).length})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expense list */}
      <div className="divide-y divide-slate-50">
        {visible.length === 0 ? (
          <div className="py-14 text-center">
            <div className="text-4xl mb-3">🧾</div>
            <p className="text-slate-500 font-medium">No expenses yet</p>
            <p className="text-sm text-slate-400 mt-1">Start tracking by adding your first expense</p>
            <button onClick={onAdd} className="mt-4 btn-primary text-sm px-5 py-2 inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        ) : (
          visible.map(expense => {
            const cat = categoryMap[expense.category_id]
            const colorClass = categoryColorMap[expense.category_id] || CATEGORY_COLORS[0]
            const isDeleting = confirmDeleteId === expense.id

            return (
              <div
                key={expense.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                {/* Category dot */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${colorClass}`}>
                  {cat?.name.charAt(0) || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{expense.title}</p>
                  <p className="text-xs text-slate-400">
                    {cat?.name || 'Unknown'} · {formatDate(expense.date)}
                  </p>
                </div>

                {/* Amount + actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-semibold text-rose-600 text-sm">
                    -${parseFloat(expense.amount.toString()).toFixed(2)}
                  </span>

                  {isDeleting ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { onDelete(expense.id); setConfirmDeleteId(null) }}
                        className="text-xs bg-rose-500 text-white px-2 py-1 rounded-lg hover:bg-rose-600 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(expense)}
                        className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                        aria-label="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(expense.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Load more */}
      {filtered.length > showCount && (
        <div className="p-4 text-center border-t border-slate-50">
          <button
            onClick={() => setShowCount(prev => prev + 8)}
            className="text-sm text-violet-600 hover:text-violet-700 font-medium hover:underline transition-colors"
          >
            Load more ({filtered.length - showCount} remaining)
          </button>
        </div>
      )}
    </div>
  )
}
