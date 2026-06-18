import { DollarSign, TrendingUp, Wallet, Activity } from 'lucide-react'

interface BudgetOverviewProps {
  monthly_budget: number
  total_spent: number
  remaining: number
  percentage_used: number
}

function formatMoney(n: number) {
  return `${n.toFixed(3)} KD`
}

export default function BudgetOverview({ monthly_budget, total_spent, remaining, percentage_used }: BudgetOverviewProps) {
  const pct = Math.min(percentage_used, 100)
  const barColor = pct < 50 ? 'from-emerald-400 to-emerald-500' : pct < 80 ? 'from-amber-400 to-amber-500' : 'from-rose-400 to-rose-500'
  const textColor = pct < 50 ? 'text-emerald-600' : pct < 80 ? 'text-amber-600' : 'text-rose-600'
  const spentColor = pct < 80 ? 'text-slate-800' : 'text-rose-600'
  const remainColor = remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'

  const stats = [
    {
      label: 'Monthly Budget',
      value: formatMoney(monthly_budget),
      icon: DollarSign,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      valueColor: 'bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent',
      sub: 'Total for this month',
    },
    {
      label: 'Total Spent',
      value: formatMoney(total_spent),
      icon: TrendingUp,
      iconBg: pct < 80 ? 'bg-blue-100' : 'bg-rose-100',
      iconColor: pct < 80 ? 'text-blue-600' : 'text-rose-600',
      valueColor: spentColor,
      sub: `${percentage_used.toFixed(1)}% of budget used`,
    },
    {
      label: 'Remaining',
      value: formatMoney(Math.abs(remaining)),
      icon: Wallet,
      iconBg: remaining >= 0 ? 'bg-emerald-100' : 'bg-rose-100',
      iconColor: remaining >= 0 ? 'text-emerald-600' : 'text-rose-600',
      valueColor: remainColor,
      sub: remaining >= 0 ? 'Left to spend' : 'Over budget!',
    },
    {
      label: 'Budget Usage',
      value: `${percentage_used.toFixed(1)}%`,
      icon: Activity,
      iconBg: pct < 50 ? 'bg-emerald-100' : pct < 80 ? 'bg-amber-100' : 'bg-rose-100',
      iconColor: textColor,
      valueColor: textColor,
      sub: pct < 50 ? 'Great progress!' : pct < 80 ? 'Keep an eye on it' : 'Almost at limit!',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-violet-100 card-hover">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <div className={`p-2 rounded-xl ${stat.iconBg}`}>
                  <Icon className={`w-4 h-4 ${stat.iconColor}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold mb-1 ${stat.valueColor}`}>{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Main progress bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-violet-100">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-slate-700">Overall Budget Progress</span>
          <span className={`text-sm font-bold ${textColor}`}>{percentage_used.toFixed(1)}%</span>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-1000 ease-out`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>0 KD</span>
          <span>{formatMoney(monthly_budget)}</span>
        </div>
      </div>
    </div>
  )
}
