'use client'

import { useState, useEffect } from 'react'
import { Receipt, Pencil, Trash2, Plus, Search, Paperclip, ImageOff } from 'lucide-react'
import type { Expense, CategoryWithStats } from '@/types'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { fetchMemeUrl } from '@/lib/memeApi'

interface ExpenseListProps {
  expenses: Expense[]
  categories: CategoryWithStats[]
  memeVariants: Record<string, number>
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
  onAdd: () => void
  onView: (expense: Expense) => void
}

function formatDate(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

const CAT_GRADIENTS = [
  'from-violet-400 to-purple-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-amber-500',
  'from-pink-400 to-rose-500',
  'from-teal-400 to-cyan-500',
  'from-amber-400 to-yellow-500',
  'from-indigo-400 to-blue-500',
]

const CAT_BADGE = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700',
  'bg-indigo-100 text-indigo-700',
]

// ── Single expense card ──────────────────────────────────────────────────────
interface CardProps {
  expense: Expense
  catName: string
  gradient: string
  badge: string
  variant: number
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}

function ExpenseCard({ expense, catName, gradient, badge, variant, onView, onEdit, onDelete }: CardProps) {
  const [memeUrl, setMemeUrl] = useState<string | null>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    setImgLoaded(false)
    setImgError(false)
    setMemeUrl(null)
    fetchMemeUrl(
      expense.id,
      expense.title,
      parseFloat(expense.amount.toString()),
      catName,
      variant,
    ).then(url => setMemeUrl(url)).catch(() => setImgError(true))
  }, [expense.id, expense.title, expense.amount, catName, variant])

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirming) {
      onDelete()
    } else {
      setConfirming(true)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit()
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(false)
  }

  return (
    <div
      onClick={() => !confirming && onView()}
      className="group relative bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
    >
      {/* Meme image area */}
      <div className="relative w-full bg-white overflow-hidden flex-shrink-0" style={{ minHeight: 180 }}>
        {/* Skeleton */}
        {!imgLoaded && !imgError && (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10 animate-pulse`} style={{ minHeight: 180 }} />
        )}

        {/* Error fallback */}
        {imgError && (
          <div className={`w-full flex flex-col items-center justify-center gap-2 py-10 bg-gradient-to-br ${gradient}`}>
            <ImageOff className="w-8 h-8 text-white/60" />
            <p className="text-xs text-white/70 font-medium">Meme unavailable</p>
          </div>
        )}

        {/* Actual meme — object-contain so the whole image shows */}
        {!imgError && memeUrl && (
          <img
            src={memeUrl}
            alt={`${expense.title} meme`}
            className={`w-full h-auto block transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgLoaded(true); setImgError(true) }}
          />
        )}

        {/* Attachment indicator */}
        {expense.attachment_url && (
          <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white p-1.5 rounded-full">
            <Paperclip className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Title + amount */}
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-slate-800 text-sm leading-tight line-clamp-1 flex-1">
            {expense.title}
          </p>
          <span className="font-bold text-rose-600 text-sm flex-shrink-0">
            -${parseFloat(expense.amount.toString()).toFixed(2)}
          </span>
        </div>

        {/* Category + date */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>
            {catName}
          </span>
          <span className="text-xs text-slate-400">{formatDate(expense.date)}</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-auto pt-1" onClick={e => e.stopPropagation()}>
          {confirming ? (
            <>
              <button
                onClick={handleDelete}
                className="flex-1 py-1.5 text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors"
              >
                Confirm Delete
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEdit}
                className="flex-1 py-1.5 text-xs font-medium bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-1.5 text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* "Click to view" hint on hover */}
      {!confirming && (
        <div className="absolute inset-0 bg-violet-600/0 group-hover:bg-violet-600/[0.03] transition-colors rounded-2xl pointer-events-none" />
      )}
    </div>
  )
}

// ── Main list component ──────────────────────────────────────────────────────
export default function ExpenseList({ expenses, categories, memeVariants, onEdit, onDelete, onAdd, onView }: ExpenseListProps) {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showCount, setShowCount] = useState(8)

  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const catGradientMap = Object.fromEntries(categories.map((c, i) => [c.id, CAT_GRADIENTS[i % CAT_GRADIENTS.length]]))
  const catBadgeMap = Object.fromEntries(categories.map((c, i) => [c.id, CAT_BADGE[i % CAT_BADGE.length]]))

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
    <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
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

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search expenses…"
          className="input-field pl-9 text-sm py-2"
        />
      </div>

      {/* Category filter tabs */}
      {categoriesWithExpenses.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
          <button
            onClick={() => setFilter('all')}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
              filter === 'all'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {categoriesWithExpenses.map((cat, i) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                filter === cat.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name} <span className="opacity-60 ml-0.5">({expenses.filter(e => e.category_id === cat.id).length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Card grid */}
      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-5xl mb-4">🧾</div>
          <p className="text-slate-500 font-semibold text-base">No expenses yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">Start tracking by adding your first expense</p>
          <button onClick={onAdd} className="btn-primary text-sm px-5 py-2.5 inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {visible.map(expense => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                catName={categoryMap[expense.category_id]?.name ?? 'General'}
                gradient={catGradientMap[expense.category_id] ?? CAT_GRADIENTS[0]}
                badge={catBadgeMap[expense.category_id] ?? CAT_BADGE[0]}
                variant={memeVariants[expense.id] ?? 0}
                onView={() => onView(expense)}
                onEdit={() => onEdit(expense)}
                onDelete={() => onDelete(expense.id)}
              />
            ))}
          </div>

          {filtered.length > showCount && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowCount(prev => prev + 8)}
                className="text-sm text-violet-600 hover:text-violet-700 font-semibold hover:underline transition-colors"
              >
                Load more ({filtered.length - showCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
