import { supabase } from './supabase'
import type { Budget, Category, CategoryWithStats, Expense } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function getAuthHeader(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || ''}`,
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const getBudget = (month: string): Promise<Budget> =>
  request(`/api/budgets?month=${month}`)

export const createBudget = (data: {
  monthly_budget: number
  month: string
  categories: Array<{ name: string; allocated_amount: number }>
}): Promise<Budget> =>
  request('/api/budgets', { method: 'POST', body: JSON.stringify(data) })

export const updateBudget = (id: string, data: { monthly_budget: number }): Promise<Budget> =>
  request(`/api/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteBudget = (id: string): Promise<void> =>
  request(`/api/budgets/${id}`, { method: 'DELETE' })

export const getCategories = (budgetId: string): Promise<CategoryWithStats[]> =>
  request(`/api/categories?budget_id=${budgetId}`)

export const createCategory = (data: {
  budget_id: string
  name: string
  allocated_amount: number
}): Promise<Category> =>
  request('/api/categories', { method: 'POST', body: JSON.stringify(data) })

export const updateCategory = (id: string, data: Partial<Category>): Promise<Category> =>
  request(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteCategory = (id: string): Promise<void> =>
  request(`/api/categories/${id}`, { method: 'DELETE' })

export const getExpenses = (budgetId: string, categoryId?: string): Promise<Expense[]> => {
  const params = new URLSearchParams({ budget_id: budgetId })
  if (categoryId) params.append('category_id', categoryId)
  return request(`/api/expenses?${params}`)
}

export const createExpense = (data: {
  budget_id: string
  category_id: string
  title: string
  amount: number
  date: string
}): Promise<Expense> =>
  request('/api/expenses', { method: 'POST', body: JSON.stringify(data) })

export const updateExpense = (id: string, data: Partial<Expense>): Promise<Expense> =>
  request(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteExpense = (id: string): Promise<void> =>
  request(`/api/expenses/${id}`, { method: 'DELETE' })
