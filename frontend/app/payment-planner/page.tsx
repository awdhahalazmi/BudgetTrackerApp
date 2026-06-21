'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays, Plus, CheckCircle2, Circle, Trash2, Edit2,
  RepeatIcon, TrendingDown, ChevronLeft, ChevronRight, AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  format, parseISO, isToday, isTomorrow, isPast, differenceInDays,
  addWeeks, addMonths, addYears, startOfMonth, endOfMonth,
  getDaysInMonth, getDay,
} from 'date-fns'
import Navbar from '@/components/Navbar'
import PlannedPaymentModal, { CATEGORY_EMOJI } from '@/components/PlannedPaymentModal'
import type { PlannedPayment } from '@/types'

type Tab = 'upcoming' | 'all' | 'calendar'

function dueDateLabel(dateStr: string): { label: string; color: string } {
  const d = parseISO(dateStr)
  if (isPast(d) && !isToday(d)) return { label: 'Overdue', color: 'text-rose-600 bg-rose-50' }
  if (isToday(d)) return { label: 'Today', color: 'text-amber-600 bg-amber-50' }
  if (isTomorrow(d)) return { label: 'Tomorrow', color: 'text-blue-600 bg-blue-50' }
  const days = differenceInDays(d, new Date())
  return { label: `In ${days} days`, color: 'text-slate-500 bg-slate-100' }
}

function nextOccurrence(dueDate: string, interval: 'weekly' | 'monthly' | 'yearly'): string {
  const d = parseISO(dueDate)
  if (interval === 'weekly') return format(addWeeks(d, 1), 'yyyy-MM-dd')
  if (interval === 'yearly') return format(addYears(d, 1), 'yyyy-MM-dd')
  return format(addMonths(d, 1), 'yyyy-MM-dd')
}

export default function PaymentPlannerPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [payments, setPayments] = useState<PlannedPayment[]>([])
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('upcoming')
  const [showModal, setShowModal] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PlannedPayment | null>(null)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all')

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    setUserEmail(user.email ?? '')
    setUserId(user.id)

    // Check subscription
    const { data: sub } = await supabase
      .from('planner_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!sub) { router.push('/upgrade'); return }

    // Load planned payments
    const { data: pData } = await supabase
      .from('planned_payments')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true })

    setPayments(pData ?? [])

    // Load this month's budget for estimator
    const currentMonth = format(new Date(), 'yyyy-MM-01')
    const { data: budgetData } = await supabase
      .from('budgets')
      .select('monthly_budget')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .maybeSingle()

    setMonthlyBudget(budgetData?.monthly_budget ?? 0)
    setLoading(false)
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async (data: Omit<PlannedPayment, 'id' | 'user_id' | 'created_at' | 'is_paid'>) => {
    if (editingPayment) {
      const { error } = await supabase
        .from('planned_payments')
        .update(data)
        .eq('id', editingPayment.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('planned_payments')
        .insert({ ...data, user_id: userId, is_paid: false })
      if (error) throw error
    }
    await loadData()
  }

  const handleMarkPaid = async (payment: PlannedPayment) => {
    // Mark current as paid
    const { error } = await supabase
      .from('planned_payments')
      .update({ is_paid: true })
      .eq('id', payment.id)
    if (error) return

    // If recurring, create next occurrence
    if (payment.is_recurring && payment.recurring_interval) {
      const nextDate = nextOccurrence(payment.due_date, payment.recurring_interval)
      await supabase.from('planned_payments').insert({
        user_id: userId,
        title: payment.title,
        amount: payment.amount,
        category: payment.category,
        due_date: nextDate,
        is_paid: false,
        is_recurring: true,
        recurring_interval: payment.recurring_interval,
        notes: payment.notes,
      })
    }

    await loadData()
  }

  const handleMarkUnpaid = async (id: string) => {
    await supabase.from('planned_payments').update({ is_paid: false }).eq('id', id)
    await loadData()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('planned_payments').delete().eq('id', id)
    await loadData()
  }

  // ── Derived data ──────────────────────────────────────────

  const unpaid = payments.filter(p => !p.is_paid)
  const thisMonthUnpaid = unpaid.filter(p => {
    const m = format(parseISO(p.due_date), 'yyyy-MM')
    return m === format(new Date(), 'yyyy-MM')
  })
  const thisMonthPaid = payments.filter(p => {
    const m = format(parseISO(p.due_date), 'yyyy-MM')
    return m === format(new Date(), 'yyyy-MM') && p.is_paid
  })
  const totalUnpaidAmount = unpaid.reduce((s, p) => s + Number(p.amount), 0)
  const thisMonthUnpaidAmount = thisMonthUnpaid.reduce((s, p) => s + Number(p.amount), 0)
  const budgetAfterPlanned = monthlyBudget - thisMonthUnpaidAmount
  const overdue = unpaid.filter(p => isPast(parseISO(p.due_date)) && !isToday(parseISO(p.due_date)))

  const filteredAll = payments.filter(p => {
    if (filterPaid === 'paid') return p.is_paid
    if (filterPaid === 'unpaid') return !p.is_paid
    return true
  })

  // Calendar helpers
  const calYear = calendarDate.getFullYear()
  const calMonth = calendarDate.getMonth()
  const daysInMonth = getDaysInMonth(calendarDate)
  const firstDayOfWeek = getDay(startOfMonth(calendarDate))
  const calPayments = payments.filter(p => {
    const d = parseISO(p.due_date)
    return d.getFullYear() === calYear && d.getMonth() === calMonth
  })
  const paymentsByDay: Record<number, PlannedPayment[]> = {}
  calPayments.forEach(p => {
    const day = parseISO(p.due_date).getDate()
    if (!paymentsByDay[day]) paymentsByDay[day] = []
    paymentsByDay[day].push(p)
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userEmail={userEmail} />

      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-violet-600" />
              Payment Planner
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Schedule and track all your upcoming bills & payments</p>
          </div>
          <button
            onClick={() => { setEditingPayment(null); setShowModal(true) }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Payment
          </button>
        </div>

        {/* Overdue alert */}
        {overdue.length > 0 && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="text-rose-700 text-sm font-medium">
              You have {overdue.length} overdue payment{overdue.length > 1 ? 's' : ''} totaling{' '}
              <strong>{overdue.reduce((s, p) => s + Number(p.amount), 0).toFixed(3)} KD</strong>
            </p>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            label="Total Unpaid"
            value={`${totalUnpaidAmount.toFixed(3)} KD`}
            sub={`${unpaid.length} payment${unpaid.length !== 1 ? 's' : ''}`}
            color="text-rose-600"
            bg="bg-rose-50"
          />
          <SummaryCard
            label="Due This Month"
            value={`${thisMonthUnpaidAmount.toFixed(3)} KD`}
            sub={`${thisMonthUnpaid.length} unpaid`}
            color="text-amber-600"
            bg="bg-amber-50"
          />
          <SummaryCard
            label="Paid This Month"
            value={`${thisMonthPaid.reduce((s, p) => s + Number(p.amount), 0).toFixed(3)} KD`}
            sub={`${thisMonthPaid.length} done ✓`}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <SummaryCard
            label="Budget After Bills"
            value={`${budgetAfterPlanned.toFixed(3)} KD`}
            sub={monthlyBudget > 0 ? `of ${monthlyBudget.toFixed(3)} KD` : 'No budget set'}
            color={budgetAfterPlanned >= 0 ? 'text-violet-600' : 'text-rose-600'}
            bg="bg-violet-50"
          />
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-slate-100 mb-6 w-fit gap-1">
          {(['upcoming', 'all', 'calendar'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                tab === t
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'upcoming' ? 'Upcoming' : t === 'all' ? 'All Payments' : 'Calendar'}
            </button>
          ))}
        </div>

        {/* ── UPCOMING TAB ── */}
        {tab === 'upcoming' && (
          <div>
            {unpaid.length === 0 ? (
              <EmptyState
                title="No upcoming payments"
                desc="Schedule your first bill, rent, or subscription."
                onAdd={() => { setEditingPayment(null); setShowModal(true) }}
              />
            ) : (
              <PaymentList
                payments={unpaid}
                onMarkPaid={handleMarkPaid}
                onMarkUnpaid={handleMarkUnpaid}
                onEdit={p => { setEditingPayment(p); setShowModal(true) }}
                onDelete={handleDelete}
              />
            )}
          </div>
        )}

        {/* ── ALL PAYMENTS TAB ── */}
        {tab === 'all' && (
          <div>
            <div className="flex gap-2 mb-4">
              {(['all', 'unpaid', 'paid'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterPaid(f)}
                  className={`text-sm px-4 py-1.5 rounded-xl font-medium transition-all capitalize ${
                    filterPaid === f
                      ? 'bg-slate-800 text-white'
                      : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'unpaid' ? 'Unpaid' : 'Paid'}
                </button>
              ))}
            </div>
            {filteredAll.length === 0 ? (
              <EmptyState
                title="No payments found"
                desc="Try a different filter or add a new payment."
                onAdd={() => { setEditingPayment(null); setShowModal(true) }}
              />
            ) : (
              <PaymentList
                payments={filteredAll}
                onMarkPaid={handleMarkPaid}
                onMarkUnpaid={handleMarkUnpaid}
                onEdit={p => { setEditingPayment(p); setShowModal(true) }}
                onDelete={handleDelete}
              />
            )}
          </div>
        )}

        {/* ── CALENDAR TAB ── */}
        {tab === 'calendar' && (
          <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-6">
            {/* Calendar nav */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-slate-800 text-lg">
                {format(calendarDate, 'MMMM yyyy')}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCalendarDate(d => addMonths(d, -1))}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCalendarDate(new Date())}
                  className="px-3 py-1.5 text-xs font-medium rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => setCalendarDate(d => addMonths(d, 1))}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty leading cells */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const dayPayments = paymentsByDay[day] ?? []
                const isCurrentDay = isToday(new Date(calYear, calMonth, day))
                const unpaidCount = dayPayments.filter(p => !p.is_paid).length

                return (
                  <div
                    key={day}
                    className={`min-h-[60px] rounded-xl p-1.5 border transition-colors ${
                      isCurrentDay
                        ? 'bg-violet-50 border-violet-300'
                        : dayPayments.length > 0
                        ? 'bg-slate-50 border-slate-200 hover:border-violet-200'
                        : 'border-transparent'
                    }`}
                  >
                    <div className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                      isCurrentDay ? 'bg-violet-600 text-white' : 'text-slate-500'
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayPayments.slice(0, 2).map(p => (
                        <div
                          key={p.id}
                          className={`text-[9px] font-medium truncate px-1 py-0.5 rounded ${
                            p.is_paid
                              ? 'bg-emerald-100 text-emerald-700 line-through'
                              : 'bg-violet-100 text-violet-700'
                          }`}
                          title={`${p.title} – ${Number(p.amount).toFixed(3)} KD`}
                        >
                          {CATEGORY_EMOJI[p.category] ?? '📦'} {p.title}
                        </div>
                      ))}
                      {dayPayments.length > 2 && (
                        <div className="text-[9px] text-slate-400 font-medium px-1">
                          +{dayPayments.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-violet-200" /> Unpaid
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-200" /> Paid
              </span>
              <span className="ml-auto font-medium text-slate-600">
                {calPayments.length} payment{calPayments.length !== 1 ? 's' : ''} this month
              </span>
            </div>
          </div>
        )}
      </div>

      <PlannedPaymentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        payment={editingPayment}
        onSave={handleSave}
      />
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────

function SummaryCard({ label, value, sub, color, bg }: {
  label: string; value: string; sub: string; color: string; bg: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-violet-100">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-xl font-bold ${color} mb-0.5`}>{value}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  )
}

function PaymentList({ payments, onMarkPaid, onMarkUnpaid, onEdit, onDelete }: {
  payments: PlannedPayment[]
  onMarkPaid: (p: PlannedPayment) => void
  onMarkUnpaid: (id: string) => void
  onEdit: (p: PlannedPayment) => void
  onDelete: (id: string) => void
}) {
  // Group by month
  const groups: Record<string, PlannedPayment[]> = {}
  payments.forEach(p => {
    const key = format(parseISO(p.due_date), 'MMMM yyyy')
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  })

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([month, items]) => (
        <div key={month}>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">{month}</h3>
          <div className="space-y-2">
            {items.map(p => (
              <PaymentCard
                key={p.id}
                payment={p}
                onMarkPaid={() => onMarkPaid(p)}
                onMarkUnpaid={() => onMarkUnpaid(p.id)}
                onEdit={() => onEdit(p)}
                onDelete={() => onDelete(p.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PaymentCard({ payment: p, onMarkPaid, onMarkUnpaid, onEdit, onDelete }: {
  payment: PlannedPayment
  onMarkPaid: () => void
  onMarkUnpaid: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { label, color } = dueDateLabel(p.due_date)
  const emoji = CATEGORY_EMOJI[p.category] ?? '📦'

  return (
    <div className={`bg-white rounded-2xl border p-4 flex items-center gap-4 shadow-sm transition-all hover:shadow-md ${
      p.is_paid ? 'opacity-60 border-slate-100' : 'border-violet-100'
    }`}>
      {/* Check button */}
      <button
        onClick={p.is_paid ? onMarkUnpaid : onMarkPaid}
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
          p.is_paid
            ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
            : 'border-2 border-slate-300 hover:border-violet-400 text-transparent hover:text-violet-400'
        }`}
        title={p.is_paid ? 'Mark as unpaid' : 'Mark as paid'}
      >
        <CheckCircle2 className="w-4 h-4" />
      </button>

      {/* Emoji */}
      <span className="text-xl flex-shrink-0">{emoji}</span>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-semibold text-slate-800 text-sm truncate ${p.is_paid ? 'line-through text-slate-400' : ''}`}>
            {p.title}
          </p>
          {p.is_recurring && (
            <RepeatIcon className="w-3 h-3 text-slate-400 flex-shrink-0" title={`Repeats ${p.recurring_interval}`} />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-400">{format(parseISO(p.due_date), 'MMM d, yyyy')}</span>
          {!p.is_paid && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${color}`}>
              {label}
            </span>
          )}
          {p.notes && <span className="text-xs text-slate-400 truncate max-w-[120px]">{p.notes}</span>}
        </div>
      </div>

      {/* Amount */}
      <span className={`font-bold text-sm flex-shrink-0 ${p.is_paid ? 'text-slate-400' : 'text-slate-800'}`}>
        {Number(p.amount).toFixed(3)} KD
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function EmptyState({ title, desc, onAdd }: { title: string; desc: string; onAdd: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
      <div className="text-4xl mb-3">🗓</div>
      <h3 className="font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 mb-5">{desc}</p>
      <button onClick={onAdd} className="btn-primary inline-flex items-center gap-2">
        <Plus className="w-4 h-4" /> Schedule Payment
      </button>
    </div>
  )
}
