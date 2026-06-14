'use client'

import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { Expense } from '@/types'
import { format, parseISO, getDaysInMonth, getMonth, getYear } from 'date-fns'

interface Props {
  expenses: Expense[]
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-lg rounded-xl px-4 py-3 border border-slate-100 text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-violet-600">${p.value.toFixed(2)}</p>
        ))}
      </div>
    )
  }
  return null
}

export default function SpendingTrend({ expenses }: Props) {
  const [view, setView] = useState<'daily' | 'cumulative'>('cumulative')

  const now = new Date()
  const year = getYear(now)
  const month = getMonth(now)
  const daysInMonth = getDaysInMonth(now)

  const dailyMap: Record<number, number> = {}
  expenses.forEach(e => {
    const d = parseISO(e.date)
    if (getMonth(d) === month && getYear(d) === year) {
      const day = d.getDate()
      dailyMap[day] = (dailyMap[day] || 0) + parseFloat(e.amount.toString())
    }
  })

  let cumulative = 0
  const data = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const daily = dailyMap[day] || 0
    cumulative += daily
    return {
      label: format(new Date(year, month, day), 'MMM d'),
      daily,
      cumulative,
    }
  }).filter((_, i) => i <= now.getDate() - 1)

  const hasData = expenses.length > 0

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-violet-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-violet-500" />
          <h3 className="font-bold text-slate-800">Spending Trend</h3>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
          {(['daily', 'cumulative'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                view === v ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {v === 'daily' ? 'Daily' : 'Total'}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="h-44 flex flex-col items-center justify-center text-center">
          <div className="text-3xl mb-2">📈</div>
          <p className="text-slate-500 text-sm">No spending data yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={v => `$${v}`}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={view}
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#violetGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#8b5cf6' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
