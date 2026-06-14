'use client'

import { Plus, AlertTriangle } from 'lucide-react'
import type { CategoryWithStats } from '@/types'

const EMOJI_MAP: Record<string, string> = {
  groceries: '🛒',
  food: '🍔',
  dining: '🍔',
  transport: '🚗',
  shopping: '🛍️',
  entertainment: '🎬',
  subscriptions: '📱',
  coffee: '☕',
  savings: '💰',
  health: '💊',
  travel: '✈️',
  gaming: '🎮',
  books: '📚',
  fitness: '🏋️',
  music: '🎵',
  housing: '🏠',
}

function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase()
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key)) return emoji
  }
  return name.charAt(0).toUpperCase()
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

interface CategoryCardProps {
  category: CategoryWithStats
  onAddExpense: (categoryId: string) => void
}

export default function CategoryCard({ category, onAddExpense }: CategoryCardProps) {
  const { name, allocated_amount, spent, remaining, percentage } = category
  const pct = Math.min(percentage, 100)
  const isOver = remaining < 0
  const isWarning = percentage >= 80 && !isOver

  const barColor = isOver
    ? 'from-rose-400 to-rose-500'
    : isWarning
    ? 'from-amber-400 to-orange-400'
    : percentage > 50
    ? 'from-amber-400 to-amber-500'
    : 'from-emerald-400 to-emerald-500'

  const emoji = getCategoryEmoji(name)
  const isEmoji = emoji.length > 1 || emoji.charCodeAt(0) > 255

  const gradients = [
    'from-violet-400 to-purple-500',
    'from-blue-400 to-indigo-500',
    'from-emerald-400 to-teal-500',
    'from-orange-400 to-amber-500',
    'from-pink-400 to-rose-500',
  ]
  const gradientIndex = name.length % gradients.length

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-violet-100 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isEmoji ? 'bg-slate-50' : `bg-gradient-to-br ${gradients[gradientIndex]} text-white font-bold text-sm`}`}>
            {emoji}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm leading-tight">{name}</h3>
            <p className="text-xs text-slate-400">Budget: {formatMoney(allocated_amount)}</p>
          </div>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          isOver ? 'bg-rose-100 text-rose-700' :
          isWarning ? 'bg-amber-100 text-amber-700' :
          'bg-violet-50 text-violet-700'
        }`}>
          {percentage.toFixed(0)}%
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-slate-50 rounded-xl p-2.5">
          <p className="text-xs text-slate-400 mb-0.5">Spent</p>
          <p className={`font-semibold ${isOver ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-700'}`}>
            {formatMoney(spent)}
          </p>
        </div>
        <div className={`rounded-xl p-2.5 ${isOver ? 'bg-rose-50' : 'bg-emerald-50'}`}>
          <p className="text-xs text-slate-400 mb-0.5">Remaining</p>
          <p className={`font-semibold ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
            {isOver ? `-${formatMoney(Math.abs(remaining))}` : formatMoney(remaining)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700 ease-out`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      {isOver ? (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2 font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          Over budget by {formatMoney(Math.abs(remaining))}
        </div>
      ) : (
        <button
          onClick={() => onAddExpense(category.id)}
          className="flex items-center justify-center gap-1.5 text-xs text-violet-600 border border-violet-200 hover:bg-violet-50 rounded-xl px-3 py-2 font-medium transition-all duration-200"
        >
          <Plus className="w-3.5 h-3.5" /> Add Expense
        </button>
      )}
    </div>
  )
}
