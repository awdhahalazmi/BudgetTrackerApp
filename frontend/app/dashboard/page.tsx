'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Plus, Settings2 } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Budget, Category, Expense, CategoryWithStats } from '@/types'
import Navbar from '@/components/Navbar'
import BudgetOverview from '@/components/BudgetOverview'
import CategoryCard from '@/components/CategoryCard'
import ExpenseList from '@/components/ExpenseList'
import ExpenseModal from '@/components/ExpenseModal'
import Notifications from '@/components/Notifications'

const SpendingByCategory = dynamic(() => import('@/components/charts/SpendingByCategory'), { ssr: false })
const SpendingTrend = dynamic(() => import('@/components/charts/SpendingTrend'), { ssr: false })
const RemainingBudget = dynamic(() => import('@/components/charts/RemainingBudget'), { ssr: false })

function currentMonth(): string {
  return format(new Date(), 'yyyy-MM-01')
}

function computeCategoriesWithStats(cats: Category[], exps: Expense[]): CategoryWithStats[] {
  return cats.map(cat => {
    const catExpenses = exps.filter(e => e.category_id === cat.id)
    const spent = catExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
    const allocated = parseFloat(cat.allocated_amount.toString())
    return {
      ...cat,
      spent,
      remaining: allocated - spent,
      percentage: allocated > 0 ? (spent / allocated) * 100 : 0,
      expenses: catExpenses,
    }
  })
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-violet-100 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-slate-100 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-slate-100 rounded w-2/3" />
          <div className="h-2 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="h-12 bg-slate-100 rounded-xl" />
        <div className="h-12 bg-slate-100 rounded-xl" />
      </div>
      <div className="h-2 bg-slate-100 rounded-full" />
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [budget, setBudget] = useState<Budget | null>(null)
  const [categories, setCategories] = useState<CategoryWithStats[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [greeting, setGreeting] = useState('Hello')
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  const loadDashboard = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    setUserEmail(user.email || '')

    const { data: budgetData, error: budgetErr } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', currentMonth())
      .maybeSingle()

    if (budgetErr) { console.error(budgetErr); setLoading(false); return }

    if (!budgetData) {
      setBudget(null)
      setLoading(false)
      return
    }

    setBudget(budgetData)

    const [{ data: catsData }, { data: expsData }] = await Promise.all([
      supabase.from('categories').select('*').eq('budget_id', budgetData.id).order('created_at'),
      supabase.from('expenses').select('*').eq('budget_id', budgetData.id).order('date', { ascending: false }),
    ])

    const cats = catsData || []
    const exps = expsData || []

    setCategories(computeCategoriesWithStats(cats, exps))
    setExpenses(exps)
    setLoading(false)
  }, [router])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const handleDelete = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id)
    await loadDashboard()
  }

  const openAddExpense = (categoryId?: string) => {
    setEditingExpense(null)
    setSelectedCategoryId(categoryId)
    setShowExpenseModal(true)
  }

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setSelectedCategoryId(undefined)
    setShowExpenseModal(true)
  }

  const total_spent = expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
  const remaining = budget ? parseFloat(budget.monthly_budget.toString()) - total_spent : 0
  const percentage_used = budget ? (total_spent / parseFloat(budget.monthly_budget.toString())) * 100 : 0

  // Inject pre-selected category into modal
  const modalCategories = selectedCategoryId
    ? [...categories].sort((a, b) => a.id === selectedCategoryId ? -1 : b.id === selectedCategoryId ? 1 : 0)
    : categories

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-purple-50">
      <Navbar userEmail={userEmail} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {loading ? (
          <div className="space-y-8">
            <div className="h-8 bg-slate-200 rounded-xl w-64 animate-pulse" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-violet-100" />)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
            </div>
          </div>
        ) : !budget ? (
          // No budget state
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="text-7xl mb-6">💸</div>
            <h2 className="text-3xl font-bold text-slate-800 mb-3">Set up your budget</h2>
            <p className="text-slate-500 max-w-md mb-8">
              You haven&apos;t set up a budget for {format(new Date(), 'MMMM yyyy')} yet.
              Let&apos;s create one so you can start tracking your spending!
            </p>
            <button onClick={() => router.push('/setup')} className="btn-primary text-lg px-8 py-4">
              Create My Budget →
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Greeting */}
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {greeting}! 👋
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {format(new Date(), 'MMMM yyyy')} · Here&apos;s your spending overview
              </p>
            </div>

            {/* Notifications */}
            {categories.length > 0 && <Notifications categories={categories} />}

            {/* Budget Overview */}
            <BudgetOverview
              monthly_budget={parseFloat(budget.monthly_budget.toString())}
              total_spent={total_spent}
              remaining={remaining}
              percentage_used={percentage_used}
            />

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SpendingByCategory categories={categories} />
              <SpendingTrend expenses={expenses} />
              <RemainingBudget categories={categories} />
            </div>

            {/* Categories */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Your Categories</h2>
                  <p className="text-sm text-slate-500">{categories.length} categories this month</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push('/setup')}
                    className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                    title="Manage budget"
                  >
                    <Settings2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openAddExpense()}
                    className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2"
                  >
                    <Plus className="w-4 h-4" /> Add Expense
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categories.map(cat => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onAddExpense={openAddExpense}
                  />
                ))}
              </div>
            </div>

            {/* Expense List */}
            <ExpenseList
              expenses={expenses}
              categories={categories}
              onEdit={openEditExpense}
              onDelete={handleDelete}
              onAdd={() => openAddExpense()}
            />
          </div>
        )}
      </main>

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => { setShowExpenseModal(false); setEditingExpense(null) }}
        categories={modalCategories}
        budgetId={budget?.id || ''}
        expense={editingExpense}
        onSuccess={loadDashboard}
      />
    </div>
  )
}
