'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { BarChart2 } from 'lucide-react'
import type { CategoryWithStats } from '@/types'

interface Props {
  categories: CategoryWithStats[]
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: CategoryWithStats }> }) => {
  if (active && payload && payload.length) {
    const cat = payload[0].payload
    const isOver = cat.remaining < 0
    return (
      <div className="bg-white shadow-lg rounded-xl px-4 py-3 border border-slate-100 text-sm">
        <p className="font-semibold text-slate-800 mb-1">{cat.name}</p>
        <p className={isOver ? 'text-rose-600' : 'text-emerald-600'}>
          {isOver ? 'Over by ' : 'Remaining: '}
          ${Math.abs(cat.remaining).toFixed(2)}
        </p>
        <p className="text-slate-500">Budget: ${parseFloat(cat.allocated_amount.toString()).toFixed(2)}</p>
      </div>
    )
  }
  return null
}

function getBarColor(cat: CategoryWithStats): string {
  if (cat.remaining < 0) return '#f43f5e'
  if (cat.remaining < cat.allocated_amount * 0.2) return '#f97316'
  if (cat.remaining < cat.allocated_amount * 0.5) return '#f59e0b'
  return '#10b981'
}

export default function RemainingBudget({ categories }: Props) {
  const data = [...categories]
    .sort((a, b) => b.remaining - a.remaining)
    .map(c => ({
      ...c,
      name: c.name.length > 12 ? c.name.substring(0, 12) + '…' : c.name,
      displayRemaining: c.remaining,
    }))

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-violet-100">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-5 h-5 text-violet-500" />
        <h3 className="font-bold text-slate-800">Remaining Budget</h3>
      </div>

      {categories.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-center">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-slate-500 text-sm">No categories yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              tickFormatter={v => `$${v}`}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={0} stroke="#e2e8f0" strokeWidth={1} />
            <Bar dataKey="displayRemaining" radius={[0, 6, 6, 0]} barSize={18}>
              {data.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Good</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Low</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Over</span>
      </div>
    </div>
  )
}
