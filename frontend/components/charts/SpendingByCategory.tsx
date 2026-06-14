'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'
import type { CategoryWithStats } from '@/types'

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6', '#f97316', '#ec4899', '#14b8a6', '#84cc16', '#6366f1']

interface Props {
  categories: CategoryWithStats[]
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { percentage: string } }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-lg rounded-xl px-4 py-3 border border-slate-100 text-sm">
        <p className="font-semibold text-slate-800">{payload[0].name}</p>
        <p className="text-violet-600">${payload[0].value.toFixed(2)}</p>
        <p className="text-slate-500">{payload[0].payload.percentage}% of spending</p>
      </div>
    )
  }
  return null
}

export default function SpendingByCategory({ categories }: Props) {
  const data = categories
    .filter(c => c.spent > 0)
    .map(c => ({ name: c.name, spent: c.spent }))

  const total = data.reduce((s, d) => s + d.spent, 0)
  const dataWithPct = data.map(d => ({
    ...d,
    percentage: total > 0 ? ((d.spent / total) * 100).toFixed(1) : '0',
  }))

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-violet-100">
      <div className="flex items-center gap-2 mb-4">
        <PieChartIcon className="w-5 h-5 text-violet-500" />
        <h3 className="font-bold text-slate-800">Spending by Category</h3>
      </div>

      {dataWithPct.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-center">
          <div className="text-3xl mb-2">🥧</div>
          <p className="text-slate-500 text-sm">No spending recorded yet</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={dataWithPct}
                dataKey="spent"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {dataWithPct.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="space-y-2 mt-2">
            {dataWithPct.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600 truncate max-w-[120px]">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-slate-800">${item.spent.toFixed(2)}</span>
                  <span className="text-slate-400 text-xs ml-1">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
