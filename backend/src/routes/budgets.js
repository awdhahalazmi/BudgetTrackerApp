import { Router } from 'express'

const router = Router()

// GET /api/budgets?month=2024-06-01
router.get('/', async (req, res) => {
  try {
    const { month } = req.query
    const userId = req.user.id

    let query = req.db
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: false })

    if (month) {
      query = query.eq('month', month)
    }

    const { data, error } = await query

    if (error) throw error

    res.json(month ? data[0] || null : data)
  } catch (err) {
    console.error('GET /budgets error:', err.message)
    res.status(500).json({ error: 'An internal error occurred' })
  }
})

// POST /api/budgets
router.post('/', async (req, res) => {
  try {
    const { monthly_budget, month, categories } = req.body
    const userId = req.user.id

    if (!monthly_budget || !month) {
      return res.status(400).json({ error: 'monthly_budget and month are required' })
    }

    const { data: budget, error: budgetError } = await req.db
      .from('budgets')
      .insert({ user_id: userId, monthly_budget, month })
      .select()
      .single()

    if (budgetError) throw budgetError

    if (categories && categories.length > 0) {
      const categoryRows = categories.map(c => ({
        user_id: userId,
        budget_id: budget.id,
        name: c.name,
        allocated_amount: c.allocated_amount,
      }))

      const { error: catError } = await req.db
        .from('categories')
        .insert(categoryRows)

      if (catError) throw catError
    }

    res.status(201).json(budget)
  } catch (err) {
    console.error('POST /budgets error:', err.message)
    res.status(500).json({ error: 'An internal error occurred' })
  }
})

// PUT /api/budgets/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { monthly_budget } = req.body
    const userId = req.user.id

    const { data, error } = await req.db
      .from('budgets')
      .update({ monthly_budget })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Budget not found' })

    res.json(data)
  } catch (err) {
    console.error('PUT /budgets error:', err.message)
    res.status(500).json({ error: 'An internal error occurred' })
  }
})

// DELETE /api/budgets/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const { error } = await req.db
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    res.status(204).send()
  } catch (err) {
    console.error('DELETE /budgets error:', err.message)
    res.status(500).json({ error: 'An internal error occurred' })
  }
})

export default router
