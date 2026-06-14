'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, AlertCircle } from 'lucide-react'
import type { CategoryWithStats } from '@/types'

interface NotificationsProps {
  categories: CategoryWithStats[]
}

interface Notification {
  key: string
  type: 'warning' | 'danger'
  message: string
}

const STORAGE_KEY = 'budget_tracker_dismissed'

export default function Notifications({ categories }: NotificationsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { setDismissed(new Set(JSON.parse(stored))) } catch { /* ignore */ }
    }
  }, [])

  const dismiss = (key: string) => {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(key)
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
  }

  const notifications: Notification[] = categories.flatMap(cat => {
    const results: Notification[] = []
    if (cat.percentage >= 100) {
      results.push({
        key: `danger-${cat.id}`,
        type: 'danger',
        message: `${cat.name} has exceeded its budget by $${Math.abs(cat.remaining).toFixed(2)}!`,
      })
    } else if (cat.percentage >= 80) {
      results.push({
        key: `warning-${cat.id}`,
        type: 'warning',
        message: `${cat.name} has used ${cat.percentage.toFixed(0)}% of its budget`,
      })
    }
    return results
  }).filter(n => !dismissed.has(n.key))

  if (notifications.length === 0) return null

  return (
    <div className="space-y-2">
      {notifications.map(n => (
        <div
          key={n.key}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm animate-slide-up ${
            n.type === 'danger'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-amber-50 border border-amber-200 text-amber-800'
          }`}
        >
          {n.type === 'danger'
            ? <AlertCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          }
          <span className="flex-1">{n.message}</span>
          <button
            onClick={() => dismiss(n.key)}
            className="hover:opacity-70 transition-opacity ml-2"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
