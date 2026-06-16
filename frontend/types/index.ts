export interface Budget {
  id: string
  user_id: string
  monthly_budget: number
  month: string
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  budget_id: string
  name: string
  allocated_amount: number
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  budget_id: string
  category_id: string
  title: string
  amount: number
  date: string
  attachment_url?: string | null
  created_at: string
}

export interface CategoryWithStats extends Category {
  spent: number
  remaining: number
  percentage: number
  expenses: Expense[]
}

export interface DashboardData {
  budget: Budget
  categories: CategoryWithStats[]
  expenses: Expense[]
  total_spent: number
  remaining: number
  percentage_used: number
}
